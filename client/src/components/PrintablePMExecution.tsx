import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type PMExecution, type PMExecutionTask, type Machine } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface PrintablePMExecutionProps {
  execution: PMExecution;
}

export default function PrintablePMExecution({ execution }: PrintablePMExecutionProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [] } = useQuery<PMExecutionTask[]>({
    queryKey: ['/api/pm-execution-tasks', execution.id],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const machine = machines.find(m => m.id === execution.machineId);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>PM Execution Report</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }

            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 15mm;
              margin: 0 auto;
              background: white;
            }

            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }

            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .document-title {
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
            }

            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin: 20px 0 10px 0;
              padding: 5px;
              background: #f0f0f0;
              border-left: 4px solid #000;
            }

            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 20px;
            }

            .detail-item {
              display: flex;
              padding: 5px 0;
              border-bottom: 1px solid #ddd;
            }

            .detail-label {
              font-weight: bold;
              min-width: 150px;
            }

            .detail-value {
              flex: 1;
            }

            .tasks-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }

            .tasks-table th,
            .tasks-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }

            .tasks-table th {
              background: #f0f0f0;
              font-weight: bold;
            }

            .result-pass {
              color: green;
              font-weight: bold;
            }

            .result-fail {
              color: red;
              font-weight: bold;
            }

            .result-na {
              color: gray;
            }

            .summary-section {
              margin: 20px 0;
              padding: 10px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }

            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }

            .signature-box {
              width: 30%;
              text-align: center;
            }

            .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
            }

            .signature-label {
              font-weight: bold;
              margin-top: 5px;
            }

            .footer-note {
              margin-top: 30px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              .page {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const formattedDate = format(new Date(execution.completedAt), 'dd/MM/yyyy HH:mm');

  const passCount = tasks.filter(t => t.result === 'pass').length;
  const failCount = tasks.filter(t => t.result === 'fail').length;
  const naCount = tasks.filter(t => !t.result || t.result === 'n/a').length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-pm-execution-${execution.id}`}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Report
      </Button>

      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page">
          <div className="header">
            <div className="company-name">KINTO MANUFACTURING</div>
            <div className="document-title">Preventive Maintenance Execution Report</div>
          </div>

          <div className="section-title">Machine Details</div>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Machine Name:</span>
              <span className="detail-value">{machine?.name || 'Unknown Machine'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Machine Type:</span>
              <span className="detail-value">{machine?.type || '-'}</span>
            </div>
            {machine?.location && (
              <div className="detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{machine.location}</span>
              </div>
            )}
          </div>

          <div className="section-title">Execution Details</div>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Completed Date:</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {execution.status || 'Completed'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Overall Result:</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {execution.overallResult || '-'}
              </span>
            </div>
            {execution.downtimeHours !== null && execution.downtimeHours !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Downtime:</span>
                <span className="detail-value">{execution.downtimeHours} hours</span>
              </div>
            )}
          </div>

          {execution.sparePartsUsed && (
            <>
              <div className="section-title">Spare Parts Used</div>
              <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', marginBottom: '20px' }}>
                {execution.sparePartsUsed}
              </div>
            </>
          )}

          {execution.remarks && (
            <>
              <div className="section-title">Remarks</div>
              <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', marginBottom: '20px' }}>
                {execution.remarks}
              </div>
            </>
          )}

          <div className="section-title">Maintenance Tasks</div>
          <table className="tasks-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Sr.</th>
                <th>Task Name</th>
                <th>Description</th>
                <th style={{ width: '80px' }}>Result</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr key={task.id}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>{task.taskName}</td>
                  <td>{task.description || '-'}</td>
                  <td 
                    className={
                      task.result === 'pass' ? 'result-pass' :
                      task.result === 'fail' ? 'result-fail' :
                      'result-na'
                    }
                    style={{ textAlign: 'center', textTransform: 'uppercase' }}
                  >
                    {task.result || 'N/A'}
                  </td>
                  <td>{task.remarks || '-'}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    No tasks recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="summary-section">
            <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
              Execution Summary
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Total Tasks:</span>
                <span className="detail-value">{tasks.length}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Passed:</span>
                <span className="detail-value result-pass">{passCount}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Failed:</span>
                <span className="detail-value result-fail">{failCount}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">N/A:</span>
                <span className="detail-value result-na">{naCount}</span>
              </div>
            </div>
          </div>

          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Completed By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Verified By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Authorized Signatory</div>
            </div>
          </div>

          <div className="footer-note">
            This is a computer-generated maintenance execution report.
          </div>
        </div>
      </div>
    </>
  );
}
