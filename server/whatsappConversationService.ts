/**
 * WhatsApp Conversation Service
 * Manages interactive step-by-step checklist completion via WhatsApp
 */

import { db } from './db';
import { whatsappConversationSessions, checklistTemplates, templateTasks, submissionTasks, checklistSubmissions, checklistAssignments, users, machines } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { whatsappService } from './whatsappService';

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

    // Create conversation session (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [session] = await db
      .insert(whatsappConversationSessions)
      .values({
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
        expiresAt,
      })
      .returning();

    // Send first question
    await this.sendQuestion(session.id, 0, tasksList);

    return session.id;
  }

  /**
   * Send a specific question to the operator
   */
  private async sendQuestion(sessionId: string, taskIndex: number, tasks: any[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const task = tasks[taskIndex];
    if (!task) throw new Error('Task not found');

    const questionNumber = taskIndex + 1;
    const message = `📋 *Question ${questionNumber} of ${session.totalTasks}*

${task.taskName}
${task.verificationCriteria ? `\n_${task.verificationCriteria}_` : ''}

Reply with:
✅ OK - if task is complete
❌ NOK - if there's an issue

For NOK, add remarks:
NOK - describe the problem

You can also send a photo if needed.`;

    await whatsappService.sendTextMessage({
      to: session.phoneNumber,
      message,
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
   */
  private async handleTaskAnswer(
    sessionId: string,
    data: {
      message: string;
      messageType: 'text' | 'image';
      imageUrl?: string;
    }
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const tasks = await this.getTemplateTasks(session.templateId!);
    const currentTask = tasks[session.currentTaskIndex];

    // Parse answer
    const message = data.message.trim().toUpperCase();
    let result: 'OK' | 'NOK';
    let remarks = '';

    if (message === 'OK' || message.startsWith('OK')) {
      result = 'OK';
    } else if (message === 'NOK' || message.startsWith('NOK')) {
      result = 'NOK';
      // Extract remarks after "NOK"
      const remarkMatch = data.message.match(/NOK\s*-?\s*(.+)/i);
      if (remarkMatch) {
        remarks = remarkMatch[1].trim();
      }
    } else if (data.messageType === 'image') {
      // If they send image without text, assume it's for the current question
      result = session.answers[session.currentTaskIndex]?.result || 'NOK';
      remarks = session.answers[session.currentTaskIndex]?.remarks || 'See photo';
    } else {
      // Invalid response
      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ Invalid response. Please reply with:\n✅ OK\n❌ NOK - describe issue',
      });
      return;
    }

    // Create answer object
    const answer: TaskAnswer = {
      taskIndex: session.currentTaskIndex,
      taskName: currentTask.taskName,
      result,
      remarks,
      photoUrl: data.imageUrl,
    };

    // Update answers array
    const updatedAnswers = [...(session.answers as TaskAnswer[])];
    updatedAnswers[session.currentTaskIndex] = answer;

    // Update session
    await db
      .update(whatsappConversationSessions)
      .set({
        answers: updatedAnswers,
        lastMessageAt: new Date(),
      })
      .where(eq(whatsappConversationSessions.id, sessionId));

    // Check if this was the last question
    if (session.currentTaskIndex + 1 >= session.totalTasks) {
      await this.sendConfirmationSummary(sessionId, updatedAnswers);
    } else {
      // Move to next question
      await db
        .update(whatsappConversationSessions)
        .set({
          currentTaskIndex: session.currentTaskIndex + 1,
        })
        .where(eq(whatsappConversationSessions.id, sessionId));

      await this.sendQuestion(sessionId, session.currentTaskIndex + 1, tasks);
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
      });
    } else if (response === 'CANCEL' || response === 'NO') {
      // Cancel submission
      await this.expireSession(sessionId);

      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ *Checklist Cancelled*\n\nYour answers have been discarded.',
      });
    } else {
      // Invalid response
      await whatsappService.sendTextMessage({
        to: session.phoneNumber,
        message: '❌ Invalid response. Please reply with:\n✅ CONFIRM\n❌ CANCEL',
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
    });
  }
}

export const whatsappConversationService = new WhatsAppConversationService();
