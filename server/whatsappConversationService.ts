/**
 * WhatsApp Conversation Service
 * Manages interactive step-by-step checklist completion via WhatsApp
 * Integrated with Colloki Flow AI for intelligent response interpretation
 */

import { db } from './db';
import { whatsappConversationSessions, checklistTemplates, templateTasks, submissionTasks, checklistSubmissions, checklistAssignments, users, machines } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { whatsappService } from './whatsappService';
import { collokiFlowService } from './collokiFlowService';

interface TaskAnswer {
  taskIndex: number;
  taskName: string;
  result: 'OK' | 'NOK';
  remarks?: string;
  photoUrl?: string;
}

interface ConversationState {
  sessionId: string;
  phoneNumber: string;
  currentTaskIndex: number;
  totalTasks: number;
  tasks: Array<{
    name: string;
    description?: string;
  }>;
  answers: TaskAnswer[];
  status: 'active' | 'awaiting_confirmation' | 'completed' | 'expired';
}

export class WhatsAppConversationService {
  /**
   * Start a new interactive conversation for checklist completion
   */
  async startConversation(data: {
    phoneNumber: string;
    assignmentId: string;
    templateId: string;
    machineId: string;
    operatorId: string;
  }): Promise<string> {
    // Check for existing active conversation for this assignment (prevent duplicates)
    const existingSessions = await db
      .select()
      .from(whatsappConversationSessions)
      .where(
        and(
          eq(whatsappConversationSessions.assignmentId, data.assignmentId),
          eq(whatsappConversationSessions.status, 'active')
        )
      );

    if (existingSessions.length > 0) {
      console.log(`[WHATSAPP] Active conversation already exists for assignment ${data.assignmentId}`);
      return existingSessions[0].id; // Return existing session ID
    }

    // Get checklist template tasks
    const tasksList = await db
      .select()
      .from(templateTasks)
      .where(eq(templateTasks.templateId, data.templateId))
      .orderBy(templateTasks.orderIndex);

    if (tasksList.length === 0) {
      throw new Error('No tasks found in checklist template');
    }

    // Create checklist submission (status: pending until confirmed)
    const [submission] = await db
      .insert(checklistSubmissions)
      .values({
        templateId: data.templateId,
        machineId: data.machineId,
        operatorId: data.operatorId,
        status: 'pending',
        date: new Date(),
        shift: null,
      })
      .returning();

    // Get context for AI session
    const [template] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.id, data.templateId));
    
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, data.machineId));
    
    const [operator] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.operatorId));

    // Create conversation session (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Generate a session ID for both WhatsApp and AI
    const sessionId = crypto.randomUUID();

    const [session] = await db
      .insert(whatsappConversationSessions)
      .values({
        id: sessionId,
        phoneNumber: data.phoneNumber,
        assignmentId: data.assignmentId, // Link to assignment
        submissionId: submission.id, // Real submission ID
        templateId: data.templateId,
        machineId: data.machineId,
        operatorId: data.operatorId,
        status: 'active',
        currentTaskIndex: 0,
        totalTasks: tasksList.length,
        answers: [],
        aiSessionId: sessionId, // Use same session ID for AI
        expiresAt,
      })
      .returning();

    // Initialize AI conversation context with checklist metadata
    try {
      await collokiFlowService.initializeSession({
        sessionId: session.id,
        checklistName: template?.name || 'Quality Checklist',
        machineName: machine?.name || 'Machine',
        operatorName: operator?.username || 'Operator',
      });
      console.log('[WHATSAPP AI] AI session initialized:', session.id);
    } catch (error) {
      console.error('[WHATSAPP AI] Failed to initialize AI session:', error);
      // Continue anyway - AI is optional
    }

    // Send first question (use tasksList.length directly)
    await this.sendQuestion(session.phoneNumber, 0, tasksList.length, tasksList, session.id);

    return session.id;
  }

  /**
   * Send a specific question to the operator
   * Uses snapshot data from transaction to avoid re-fetching and desync issues
   */
  private async sendQuestion(
    phoneNumber: string,
    taskIndex: number,
    totalTasks: number,
    tasks: any[],
    sessionId?: string
  ): Promise<void> {
    const task = tasks[taskIndex];
    if (!task) throw new Error('Task not found');

    const questionNumber = taskIndex + 1;
    const message = `📋 *Question ${questionNumber} of ${totalTasks}*

${task.taskName}
${task.verificationCriteria ? `\n_${task.verificationCriteria}_` : ''}

Reply with:
✅ OK - if task is complete
❌ NOK - if there's an issue

For NOK, add remarks:
NOK - describe the problem

You can also send a photo if needed.`;

    await whatsappService.sendTextMessage({
      to: phoneNumber,
      message,
      sessionId, // Use Colloki Flow if session ID provided
    });
  }

  /**
   * Handle incoming message from operator
   */
  async handleIncomingMessage(data: {
    phoneNumber: string;
    message: string;
    messageType: 'text' | 'image';
    imageUrl?: string;
  }): Promise<void> {
    // Find active session for this phone number
    const sessions = await db
      .select()
      .from(whatsappConversationSessions)
      .where(
        and(
          eq(whatsappConversationSessions.phoneNumber, data.phoneNumber),
          eq(whatsappConversationSessions.status, 'active')
        )
      );

    if (sessions.length === 0) {
      // No active session - send help message
      await whatsappService.sendTextMessage({
        to: data.phoneNumber,
        message: '❌ No active checklist found. Please wait for your checklist assignment.',
      });
      return;
    }

    const session = sessions[0];

    // Check if session expired
    if (new Date() > new Date(session.expiresAt)) {
      await this.expireSession(session.id);
      await whatsappService.sendTextMessage({
        to: data.phoneNumber,
        message: '⏱️ This checklist session has expired. Please contact your supervisor.',
        sessionId: session.id,
      });
      return;
    }

    // Handle based on session status
    if (session.status === 'awaiting_confirmation') {
      await this.handleConfirmation(session.id, data.message.trim().toUpperCase());
    } else {
      await this.handleTaskAnswer(session.id, data);
    }
  }

  /**
   * Handle task answer from operator
   * Uses AI to intelligently interpret responses
   */
  private async handleTaskAnswer(
    sessionId: string,
    data: {
      message: string;
      messageType: 'text' | 'image';
      imageUrl?: string;
    }
  ): Promise<void> {
    // Get current session to access task context
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Get current task for AI context
    const tasksList = await db
      .select()
      .from(templateTasks)
      .where(eq(templateTasks.templateId, session.templateId))
      .orderBy(templateTasks.orderIndex);

    const currentTask = tasksList[session.currentTaskIndex];
    if (!currentTask) {
      console.error('[WHATSAPP] Current task not found');
      return;
    }

    // Get context metadata for AI
    const [template] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.id, session.templateId));
    
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, session.machineId));
    
    const [operator] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.operatorId));

    // Parse message for OK/NOK (basic check first)
    const message = data.message.trim().toUpperCase();
    const hasValidAnswer = message === 'OK' || message.startsWith('OK') || 
                          message === 'NOK' || message.startsWith('NOK');

    // CASE 1: Photo with caption containing OK/NOK (common WhatsApp behavior)
    if (data.messageType === 'image' && data.imageUrl && hasValidAnswer) {
      // Use AI to interpret response with photo context
      let result: 'OK' | 'NOK';
      let remarks = '';

      try {
        const interpretation = await collokiFlowService.interpretResponse({
          operatorMessage: data.message,
          taskName: currentTask.taskName,
          verificationCriteria: currentTask.verificationCriteria || undefined,
          sessionId: session.aiSessionId || session.id,
          context: {
            machineName: machine?.name,
            templateName: template?.name,
            operatorName: operator?.username,
          },
        });

        console.log('[WHATSAPP AI] Photo+caption interpretation:', {
          status: interpretation.status,
          confidence: interpretation.confidence,
          remarks: interpretation.remarks,
        });

        // GATE: Only use AI result if confidence >= 70% AND status is not UNCLEAR
        if (interpretation.confidence >= 70 && interpretation.status !== 'UNCLEAR') {
          if (interpretation.status === 'OK') {
            result = 'OK';
          } else {
            result = 'NOK';
            remarks = interpretation.remarks || data.message;
          }
        } else {
          // Low confidence or UNCLEAR - fallback to basic keyword parsing
          console.log('[WHATSAPP AI] Low confidence or UNCLEAR, using keyword fallback');
          result = message.startsWith('NOK') ? 'NOK' : 'OK';
          if (result === 'NOK') {
            const remarkMatch = data.message.match(/NOK\s*-?\s*(.+)/i);
            remarks = remarkMatch?.[1]?.trim() || '';
          }
        }
      } catch (error) {
        console.error('[WHATSAPP AI] Interpretation failed, using keyword fallback:', error);
        // Fallback to basic keyword parsing
        result = message.startsWith('NOK') ? 'NOK' : 'OK';
        if (result === 'NOK') {
          const remarkMatch = data.message.match(/NOK\s*-?\s*(.+)/i);
          remarks = remarkMatch?.[1]?.trim() || '';
        }
      }

      await this.saveAnswerAndProgress(sessionId, {
        result,
        remarks,
        photoUrl: data.imageUrl,
      });
      return;
    }

    // CASE 2: Photo without meaningful caption (store as pending)
    if (data.messageType === 'image' && data.imageUrl && !hasValidAnswer) {
      let phoneNumber = '';

      // Use transaction to atomically store pending photo (COMMIT before network I/O)
      await db.transaction(async (tx) => {
        // Lock and fetch session
        const sessions = await tx
          .select()
          .from(whatsappConversationSessions)
          .where(eq(whatsappConversationSessions.id, sessionId))
          .for('update');

        if (!sessions || sessions.length === 0) return;

        const session = sessions[0];
        phoneNumber = session.phoneNumber;

        // Update with pending photo
        await tx
          .update(whatsappConversationSessions)
          .set({
            pendingPhotoUrl: data.imageUrl,
            lastMessageAt: new Date(),
          })
          .where(eq(whatsappConversationSessions.id, sessionId));

        // Transaction will COMMIT here (lock released)
      });

      // Send acknowledgment AFTER transaction commits (no lock held)
      if (phoneNumber) {
        await whatsappService.sendTextMessage({
          to: phoneNumber,
          message: '📸 Photo received! Now please reply with:\n✅ OK\n❌ NOK - describe issue',
          sessionId,
        });
      }
      return;
    }

    // CASE 3: Text-only answer (may attach pending photo)
    // Use AI to interpret even if it doesn't start with OK/NOK
    let result: 'OK' | 'NOK' | null = null;
    let remarks = '';

    try {
      const interpretation = await collokiFlowService.interpretResponse({
        operatorMessage: data.message,
        taskName: currentTask.taskName,
        verificationCriteria: currentTask.verificationCriteria || undefined,
        sessionId: session.aiSessionId || session.id,
        context: {
          machineName: machine?.name,
          templateName: template?.name,
          operatorName: operator?.username,
        },
      });

      console.log('[WHATSAPP AI] Text response interpretation:', {
        message: data.message,
        status: interpretation.status,
        confidence: interpretation.confidence,
        remarks: interpretation.remarks,
      });

      // GATE: Only use AI result if confidence >= 70% AND status is not UNCLEAR
      if (interpretation.confidence >= 70 && interpretation.status !== 'UNCLEAR') {
        if (interpretation.status === 'OK') {
          result = 'OK';
        } else {
          result = 'NOK';
          remarks = interpretation.remarks || data.message;
        }
      } else if (interpretation.status === 'UNCLEAR' || interpretation.confidence < 70) {
        // UNCLEAR status OR low confidence - try keyword fallback first
        console.log('[WHATSAPP AI] UNCLEAR or low confidence, trying keyword fallback');
        
        if (hasValidAnswer) {
          // Has OK/NOK keywords - use basic parsing
          result = message.startsWith('NOK') ? 'NOK' : 'OK';
          if (result === 'NOK') {
            const remarkMatch = data.message.match(/NOK\s*-?\s*(.+)/i);
            remarks = remarkMatch?.[1]?.trim() || '';
          }
        } else {
          // No valid keywords AND AI is unclear - ask operator to clarify
          await whatsappService.sendTextMessage({
            to: session.phoneNumber,
            message: '❓ I didn\'t understand your response. Please reply with:\n✅ OK - if task is complete\n❌ NOK - describe the problem',
            sessionId: session.id,
          });
          return; // DO NOT advance checklist
        }
      }
    } catch (error) {
      console.error('[WHATSAPP AI] Interpretation error, using keyword fallback:', error);
      
      // AI failed - try keyword fallback
      if (hasValidAnswer) {
        result = message.startsWith('NOK') ? 'NOK' : 'OK';
        if (result === 'NOK') {
          const remarkMatch = data.message.match(/NOK\s*-?\s*(.+)/i);
          remarks = remarkMatch?.[1]?.trim() || '';
        }
      } else {
        // No valid keywords - ask for clarification
        await whatsappService.sendTextMessage({
          to: session.phoneNumber,
          message: '❌ Invalid response. Please reply with:\n✅ OK\n❌ NOK - describe issue',
          sessionId: session.id,
        });
        return; // DO NOT advance checklist
      }
    }

    // Final safety check: result must be set
    if (result === null) {
      console.error('[WHATSAPP] No valid result determined, asking for clarification');
      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ Please reply with:\n✅ OK - if complete\n❌ NOK - if there\'s an issue',
        sessionId: session.id,
      });
      return; // DO NOT advance checklist
    }

    await this.saveAnswerAndProgress(sessionId, {
      result,
      remarks,
      photoUrl: undefined, // Will be attached from pendingPhotoUrl if exists
    });
  }

  /**
   * Save answer and progress to next question (atomically with transaction)
   */
  private async saveAnswerAndProgress(
    sessionId: string,
    partialAnswer: {
      result: 'OK' | 'NOK';
      remarks: string;
      photoUrl?: string;
    }
  ): Promise<void> {
    // Variables to hold data after transaction commits
    let isLastQuestion = false;
    let nextIndex = 0;
    let updatedAnswers: TaskAnswer[] = [];
    let phoneNumber = '';
    let totalTasks = 0;
    let tasks: any[] = [];

    // Use database transaction for true atomicity (COMMIT before network I/O)
    await db.transaction(async (tx) => {
      // Step 1: Lock session row and fetch fresh data (prevents concurrent updates)
      const sessions = await tx
        .select()
        .from(whatsappConversationSessions)
        .where(eq(whatsappConversationSessions.id, sessionId))
        .for('update'); // Row-level lock

      if (!sessions || sessions.length === 0) {
        console.error(`[WHATSAPP] Session ${sessionId} not found in transaction`);
        return;
      }

      const session = sessions[0];
      phoneNumber = session.phoneNumber;

      // Validate session state
      if (session.currentTaskIndex === null || session.totalTasks === null) {
        console.error(`[WHATSAPP] Invalid session state for ${sessionId}`);
        return;
      }

      const currentIndex = session.currentTaskIndex;
      totalTasks = session.totalTasks; // Capture for use after transaction

      // Step 2: Get template tasks (INSIDE TRANSACTION for consistency)
      tasks = await tx
        .select()
        .from(templateTasks)
        .where(eq(templateTasks.templateId, session.templateId!))
        .orderBy(templateTasks.orderIndex);

      const currentTask = tasks[currentIndex];

      // Step 3: Build complete answer with fresh locked session data
      const answer: TaskAnswer = {
        taskIndex: currentIndex,
        taskName: currentTask.taskName,
        result: partialAnswer.result,
        remarks: partialAnswer.remarks,
        // Use provided photo URL, or fallback to pending photo from locked session
        photoUrl: partialAnswer.photoUrl || session.pendingPhotoUrl || undefined,
      };

      // Step 4: Update answers array with fresh session data
      updatedAnswers = [...(session.answers as TaskAnswer[])];
      updatedAnswers[currentIndex] = answer;

      // Step 5: Atomic update within transaction
      isLastQuestion = currentIndex + 1 >= totalTasks;
      nextIndex = isLastQuestion ? currentIndex : currentIndex + 1;

      // CRITICAL: UPDATE with WHERE clause to only affect THIS session
      await tx
        .update(whatsappConversationSessions)
        .set({
          answers: updatedAnswers,
          pendingPhotoUrl: null, // Always clear pending photo
          lastMessageAt: new Date(),
          currentTaskIndex: nextIndex,
        })
        .where(eq(whatsappConversationSessions.id, sessionId));

      // Transaction will COMMIT here (lock released)
    });

    // Step 6: Send next question or summary (AFTER transaction commit, no lock held)
    if (isLastQuestion) {
      await this.sendConfirmationSummary(sessionId, updatedAnswers);
    } else {
      await this.sendQuestion(phoneNumber, nextIndex, totalTasks, tasks, sessionId);
    }
  }

  /**
   * Send final confirmation summary
   */
  private async sendConfirmationSummary(sessionId: string, answers: TaskAnswer[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Build summary message
    let summary = '✅ *All Questions Answered!*\n\n';
    summary += '📋 *Your Answers:*\n\n';

    answers.forEach((answer, index) => {
      const icon = answer.result === 'OK' ? '✅' : '❌';
      summary += `${index + 1}. ${icon} ${answer.taskName}\n`;
      summary += `   Result: ${answer.result}\n`;
      if (answer.remarks) {
        summary += `   Remarks: ${answer.remarks}\n`;
      }
      if (answer.photoUrl) {
        summary += `   📸 Photo attached\n`;
      }
      summary += '\n';
    });

    summary += '━━━━━━━━━━━━━━━━━━\n\n';
    summary += 'Reply with:\n';
    summary += '✅ *CONFIRM* - to submit\n';
    summary += '❌ *CANCEL* - to discard\n';

    // Update session status
    await db
      .update(whatsappConversationSessions)
      .set({
        status: 'awaiting_confirmation',
        lastMessageAt: new Date(),
      })
      .where(eq(whatsappConversationSessions.id, sessionId));

    await whatsappService.sendTextMessage({
      to: session.phoneNumber,
      message: summary,
      sessionId,
    });
  }

  /**
   * Handle final confirmation
   */
  private async handleConfirmation(sessionId: string, response: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    if (response === 'CONFIRM' || response === 'YES' || response === 'SUBMIT') {
      // Save to database
      await this.saveSubmission(sessionId);

      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '✅ *Checklist Submitted Successfully!*\n\nThank you for completing the checklist. Your supervisor has been notified.',
        sessionId,
      });
    } else if (response === 'CANCEL' || response === 'NO') {
      // Cancel submission
      await this.expireSession(sessionId);

      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ *Checklist Cancelled*\n\nYour answers have been discarded.',
        sessionId,
      });
    } else {
      // Invalid response
      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ Invalid response. Please reply with:\n✅ CONFIRM\n❌ CANCEL',
        sessionId,
      });
    }
  }

  /**
   * Save submission to database
   */
  private async saveSubmission(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const answers = session.answers as TaskAnswer[];

    // Update submission status
    await db
      .update(checklistSubmissions)
      .set({
        status: 'completed',
        submittedAt: new Date(),
      })
      .where(eq(checklistSubmissions.id, session.submissionId!));

    // Save individual task results
    for (const answer of answers) {
      await db.insert(submissionTasks).values({
        submissionId: session.submissionId!,
        taskName: answer.taskName,
        result: answer.result,
        remarks: answer.remarks,
        photoUrl: answer.photoUrl,
      });
    }

    // Mark session as completed
    await db
      .update(whatsappConversationSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(whatsappConversationSessions.id, sessionId));

    // Mark assignment as completed (if linked)
    if (session.assignmentId) {
      await db
        .update(checklistAssignments)
        .set({
          status: 'completed',
          operatorResponseTime: new Date(),
        })
        .where(eq(checklistAssignments.id, session.assignmentId));
    }
  }

  /**
   * Expire a session
   */
  private async expireSession(sessionId: string): Promise<void> {
    await db
      .update(whatsappConversationSessions)
      .set({
        status: 'expired',
      })
      .where(eq(whatsappConversationSessions.id, sessionId));
  }

  /**
   * Get session by ID
   */
  private async getSession(sessionId: string): Promise<any> {
    const sessions = await db
      .select()
      .from(whatsappConversationSessions)
      .where(eq(whatsappConversationSessions.id, sessionId));

    return sessions[0] || null;
  }

  /**
   * Get template tasks
   */
  private async getTemplateTasks(templateId: string): Promise<any[]> {
    return await db
      .select()
      .from(templateTasks)
      .where(eq(templateTasks.templateId, templateId))
      .orderBy(templateTasks.orderIndex);
  }

  /**
   * Send reminder for unanswered question
   */
  async sendReminder(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'active') return;

    const tasks = await this.getTemplateTasks(session.templateId);
    const currentTask = tasks[session.currentTaskIndex];

    const message = `⏰ *Reminder*\n\nYou have an unanswered question:\n\nQuestion ${session.currentTaskIndex + 1} of ${session.totalTasks}:\n${currentTask.taskName}\n\nPlease reply with OK or NOK.`;

    await whatsappService.sendTextMessage({
      to: session.phoneNumber,
      message,
      sessionId: session.id,
    });
  }
}

export const whatsappConversationService = new WhatsAppConversationService();
