# BoardEase

A school-project boarding-house manager built with Python, standard Tkinter/ttk, openpyxl, and ReportLab. The original OOP classes remain the application model; records stay in `billing_ledger.xlsx`.

## Run on Windows

```powershell
cd path\to\BoardEase
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe gui_app.py
```

The default ledger is beside `gui_app.py`, regardless of the terminal's working directory. To use a separate workbook (a new path starts empty):

```powershell
.\.venv\Scripts\python.exe gui_app.py --ledger C:\path\to\practice.xlsx
```

Keep the workbook closed in Excel while saving changes. Run one BoardEase instance per workbook.

## Pages

- **Dashboard:** room/tenant counts, paid/unpaid/overdue bills, totals, recent billing, quick actions, collection progress.
- **Rooms & Tenants:** room and tenant tables with modal add/edit forms, room transfer, and tenant removal that archives billing history.
- **Billing:** generate bills for all current occupants of a room; search tenant/room and filter All, Unpaid, Partial, Paid, or Overdue. Select a bill to see its full details or open payment entry.
- **Payments:** selected-bill summary, partial/full payments, and persistent transaction history with the balance after each payment.
- **Reports:** select a tenant and billing month, then use **Generate PDF**, **Open PDF**, or **Print PDF**. Notices are A4 portrait with dark text, simple borders, peso amounts, payment status, and signature/date-received lines for physical delivery. No tenant report is exported to Excel.

All amounts display Philippine pesos. Dates use `YYYY-MM-DD`, and new billing periods use `YYYY-MM`. Tables resize their columns to fit the window without horizontal scrollbars. Page scrolling appears only when content exceeds the available height; large tables receive a vertical scrollbar. The interface is checked at 1280 x 720, 1366 x 768, 1440 x 900, and 1920 x 1080.

## Payment and storage behavior

A bill is paid only when its recorded payment total covers its bill total. An outstanding bill past its due date displays **OVERDUE**; otherwise a bill with some payment displays **PARTIAL**, and one with none displays **UNPAID**. The Unpaid filter includes every outstanding bill; Partial includes overdue bills with a partial payment. Dashboard totals cover all billing periods. Payment-history status describes the balance immediately after that transaction.

The existing Rooms, Tenants, and Billing sheets are preserved. On first upgrade, BoardEase copies the original workbook to a timestamped file in `backups/`, appends missing Bill ID, Electricity Share, Water Share, and tenant Active columns, and creates a Payments sheet if absent. Existing cells and additional columns are preserved. This sheet is necessary to retain separate amounts and dates for multiple payments against the same bill.

Legacy Amount Paid and status cells are preserved even if the old status incorrectly said PAID. Runtime balances and statuses are reconstructed from payment transactions, not these cached cells. A nonzero historical amount is imported once as **Legacy total**. The old file cannot tell us the individual payment dates/amounts behind that total; the available last date is retained. Existing unusual billing-period labels remain readable. New bills use a validated month. Backups are never overwritten.

Writes use a temporary workbook and atomic replacement. If another program changes the workbook, saving is rejected until the application restarts so those changes cannot be overwritten. A failed save rolls back pending workbook and domain changes. Payment amounts must be positive and cannot exceed the balance. Duplicate room numbers, tenant names, and tenant/month bills are rejected. Tenant names must be distinct because the original workbook identifies tenants by name.

The Owner badge and Send Reminders control have been removed. Notification simulation remains available only in the backend and console demonstration. Normal desktop startup opens the real billing_ledger.xlsx; it never seeds demo data or silently replaces a missing default workbook.

## Printable tenant notices

Install or update the PDF dependency with:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

ReportLab is listed in `requirements.txt`. The PDF embeds Arial on Windows so the Philippine Peso symbol prints correctly. On Linux it can use DejaVu Sans; on macOS it can use Arial. A clear error is shown if no supported peso-capable font is installed.

1. Open Reports and select a tenant and billing month. Only recorded billing months are available.
2. Review the automatic statement preview. New bills retain separate electricity and water charges. Older bills show a combined Utilities line; no reconstruction or editable money fields are required.
3. Click **Generate PDF**. The result is saved under `reports/` beside the selected ledger, for example `Maria_Santos_Room102_2026-10_Billing.pdf`. Repeated generation adds `_2`, `_3`, etc. and preserves earlier PDFs.
4. The success message shows the full saved path and enables **Open PDF** and **Print PDF**. Changing the tenant or month disables these actions until the new notice is generated.
5. **Open PDF** uses the default Windows PDF viewer. **Print PDF** invokes the Windows `print` file action. Some PDF viewers send directly to the default printer; others show a print workflow. If the viewer has no print action, use Open PDF and Ctrl+P. The app reports dispatch, not physical printer completion.

Use **Generate All Bills for Month** to produce a combined file such as `October_2026_Tenant_Bills.pdf`. Each billed tenant gets one A4 page, ordered by room. Tenants without a bill for that month are excluded. The same Open PDF and Print PDF controls operate on the newly generated file.

The notice includes the selected bill's rent, stored utility breakdown, recorded amount paid, and remaining balance. Other charges are omitted because the current model has no such charges. Unpaid earlier months are shown as Previous Balance; future months and other tenants are excluded. Total Amount Due is the selected bill's remaining balance plus these earlier balances. Payment status reflects all balances included in the notice, so an older overdue balance can make the notice OVERDUE even when the selected month's bill is paid. Previous balances are a current snapshot, not a historical reconstruction.

PDF generation is read-only with respect to `billing_ledger.xlsx` and the in-memory bills/payments. Excel remains data storage only. Existing legacy month labels such as `2026-10-10` are offered as October 2026; ambiguous duplicate bills for a tenant/month are rejected instead of silently choosing one.

## Verify

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m compileall -q bill.py payment.py boarding_house.py excel_ledger.py gui_app.py ui_components.py reports.py notification.py main.py
```

The GUI test needs a desktop display. It opens Tk windows and exercises forms, payment progression, restart, filters, search, PDF generation/open/print dispatch, empty pages, long names, and resizing. All tests use temporary workbooks, including a copy of the supplied ledger. The repository's original ledger is not used for test writes.

`python main.py` still runs the OOP console demonstration, now against a temporary workbook so repeated demos cannot modify the owner's records.

PDF tests use pypdf from `requirements-dev.txt` to verify A4 size, text, totals, peso glyphs, selection, and unchanged ledger bytes. The print dispatch is mocked during automated tests; no paper is printed.

No web server, database, pandas, or CustomTkinter is required.
