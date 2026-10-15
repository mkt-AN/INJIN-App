const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { recipient, location, sessionStart, iterations } = req.body;

        // Generate PDF
        const doc = new PDFDocument({ margin: 30 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        doc.fontSize(16).text('INJIN-Corpe Pvt Ltd - Retrofit Audit Log', { align: 'center' });
        doc.fontSize(10).text(`Location: ${location || 'Global'} | Session Start: ${sessionStart || 'N/A'}`);
        doc.moveDown();

        if (iterations && iterations.length > 0) {
            iterations.forEach((item) => {
                doc.fontSize(10).text(`Iteration #${item.step} [${item.timestamp}] - Field: ${item.fieldChanged}`);
                doc.fontSize(9).text(`Type: ${item.machineType} | Weight: ${item.weightTons}T | HP: ${item.horsepower} | Req kW: ${item.requiredKw} kW | Quote: ${item.totalQuote}`);
                doc.moveDown(0.5);
            });
        } else {
            doc.fontSize(10).text('No iterations recorded.');
        }

        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: '"INJIN Audit System" <system@injincorp.com>',
            to: recipient || 'mkt@injincorp.com',
            subject: `Automated Audit Log: ${location || 'Global User'} (${iterations ? iterations.length : 0} Iterations)`,
            text: `An automated retrofit audit report was generated after inactivity.\n\nLocation: ${location}\nSession Start: ${sessionStart}\nTotal Iterations Logged: ${iterations ? iterations.length : 0}`,
            attachments: [
                {
                    filename: `Retrofit_Audit_Report.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        return res.status(200).json({ status: 'success', message: 'Audit email sent' });
    } catch (error) {
        console.error('Audit handler error:', error);
        return res.status(500).json({ error: error.message });
    }
};
