const fs = require('fs');
const path = require('path');

const htmlPath = process.argv[2];
const content = fs.readFileSync(htmlPath, 'utf8');

const styledHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sharkfunded System Overview</title>
    <style>
        :root {
            --primary: #000000;
            --secondary: #64748b;
            --accent: #2563eb;
            --bg: #ffffff;
            --card-bg: #f8fafc;
            --border: #e2e8f0;
            --text: #1e293b;
            --text-muted: #64748b;
        }

        @media print {
            body { padding: 0 !important; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            border-bottom: 2px solid var(--primary);
            margin-bottom: 40px;
            padding-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        h1 { margin: 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.025em; }
        h2 { margin-top: 2.5rem; border-left: 4px solid var(--accent); padding-left: 15px; font-size: 1.5rem; color: var(--primary); }
        h3 { margin-top: 2rem; font-size: 1.2rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.05em; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 0.95rem;
        }

        th { background: var(--card-bg); font-weight: 600; text-align: left; }
        th, td { padding: 12px 15px; border: 1px solid var(--border); }
        tr:nth-child(even) { background: #fafafa; }

        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85rem;
            line-height: 1.4;
        }

        code { font-family: "JetBrains Mono", "Fira Code", monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
        pre code { background: transparent; padding: 0; }

        .tag {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.85rem;
            text-align: center;
        }

        .alert {
            background: #eff6ff;
            border-left: 4px solid var(--accent);
            padding: 15px;
            margin: 20px 0;
            font-size: 0.95rem;
        }
    </style>
</head>
<body>
    <header>
        <div>
            <div class="tag">INTERNAL EVALUATION</div>
            <h1>Sharkfunded</h1>
        </div>
        <div style="text-align: right; color: var(--text-muted); font-size: 0.85rem;">
            Generated: Feb 2026<br>
            Version: 1.2
        </div>
    </header>

    ${content}

    <footer>
        &copy; 2026 Sharkfunded CRM. All rights reserved. Confidential Property.
    </footer>
</body>
</html>
`;

fs.writeFileSync(htmlPath, styledHtml);
console.log('Professionally wrapped HTML generated.');
