"""Read-only monthly billing notices, formatted for A4 black-and-white printing."""
import os
import re
import tempfile
from datetime import date, datetime
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepInFrame, PageBreak
from bill import billing_month


def format_currency(value):
    return f'₱{value:,.2f}'


def month_label(value):
    return datetime.strptime(billing_month(value), '%Y-%m').strftime('%B %Y')


def tenant_months(house, tenant):
    return house.billing_months(tenant)


def get_statement(house, tenant, month):
    return house.get_statement(tenant, month)


def _pdf_fonts():
    """Embed a local TrueType font with an actual Philippine peso glyph."""
    names = ('BoardEaseRegular', 'BoardEaseBold')
    if all(name in pdfmetrics.getRegisteredFontNames() for name in names):
        return names
    candidates = [
        (Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts', 'arial.ttf', 'arialbd.ttf'),
        (Path('/usr/share/fonts/truetype/dejavu'), 'DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'),
        (Path('/System/Library/Fonts/Supplemental'), 'Arial.ttf', 'Arial Bold.ttf'),
    ]
    for directory, regular, bold in candidates:
        if (directory / regular).is_file() and (directory / bold).is_file():
            fonts = [TTFont(name, str(directory / filename)) for name, filename in zip(names, (regular, bold))]
            if all(ord('₱') in font.face.charToGlyph for font in fonts):
                for font in fonts:
                    pdfmetrics.registerFont(font)
                return names
    raise ValueError('A font containing ₱ is required. Install Arial (Windows/macOS) or DejaVu Sans (Linux).')


def _safe_part(value, fallback):
    text = re.sub(r'[^\w-]+', '_', str(value), flags=re.UNICODE).strip('_')
    return text[:65] or fallback


def generate_tenant_pdf(house, tenant, month):
    statement = house.get_statement(tenant, month)
    basename = f'{_safe_part(tenant.name, "Tenant")}_Room{_safe_part(statement.bill.room_number, "Unknown")}_{billing_month(month)}_Billing'
    return _write_pdf(house, [statement], basename)


def generate_monthly_bills_pdf(house, month):
    statements = [house.get_statement(t, month) for t in house.all_tenants if house.get_tenant_bills(t, month)]
    if not statements:
        raise ValueError('No bills exist for the selected month.')
    def room_order(statement):
        return tuple((0, int(part)) if part.isdigit() else (1, part.casefold())
                     for part in re.split(r'(\d+)', statement.bill.room_number))
    statements.sort(key=lambda statement: (room_order(statement), statement.bill.tenant.name.casefold()))
    basename = datetime.strptime(billing_month(month), '%Y-%m').strftime('%B_%Y_Tenant_Bills')
    return _write_pdf(house, statements, basename)


def _statement_flowables(statement, regular, bold):
    bill = statement.bill
    tenant = bill.tenant
    month = bill.month
    body = ParagraphStyle('Body', fontName=regular, fontSize=10, leading=15, textColor=colors.black)
    strong = ParagraphStyle('Strong', parent=body, fontName=bold)
    small = ParagraphStyle('Small', parent=body, fontSize=8, leading=12)
    right = ParagraphStyle('Right', parent=body, alignment=TA_RIGHT)
    heading = ParagraphStyle('Heading', parent=strong, fontSize=17, leading=22, alignment=TA_CENTER)
    brand = ParagraphStyle('Brand', parent=strong, fontSize=24, leading=29)
    paragraph = lambda value, style=body: Paragraph(escape(str(value)), style)
    width = A4[0] - 40*mm - 12
    story = [paragraph('BoardEase', brand), paragraph('Boarding House Management'), Spacer(1, 7*mm),
             HRFlowable(width='100%', thickness=1, color=colors.black), Spacer(1, 6*mm),
             paragraph('BILLING NOTICE', heading), Spacer(1, 5*mm)]
    metadata = Table([[paragraph(label, strong), paragraph(value)] for label, value in [
        ('Tenant Name', tenant.name), ('Room Number', bill.room_number),
        ('Billing Period', month_label(month)), ('Due Date', bill.due_date)]], colWidths=[37*mm, width-37*mm])
    metadata.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),0),
                                 ('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story.extend([metadata, Spacer(1, 6*mm), paragraph('Billing Breakdown', strong), Spacer(1, 3*mm)])
    entries = bill.charge_lines() + [('Current Month Total', bill.get_total_amount())]
    if statement.previous_balance:
        entries.append(('Previous Balance (earlier months)', statement.previous_balance))
    entries.extend([('Amount Paid (this month’s bill)', bill.amount_paid), ('Remaining Balance', statement.total_due)])
    rows = [[paragraph('Description', strong), paragraph('Amount', strong)]]
    rows.extend([[paragraph(label), paragraph(format_currency(amount), right)] for label, amount in entries])
    table = Table(rows, colWidths=[width*0.69, width*0.31])
    table.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#777777')),
                              ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F2F2F2')),
                              ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                              ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
                              ('LEFTPADDING',(0,0),(-1,-1),10), ('RIGHTPADDING',(0,0),(-1,-1),10)]))
    story.extend([table, Spacer(1, 5*mm)])
    total_style = ParagraphStyle('Total', parent=strong, fontSize=14, leading=20, alignment=TA_RIGHT)
    total = Table([[paragraph('TOTAL AMOUNT DUE', strong), paragraph(format_currency(statement.total_due), total_style)]],
                  colWidths=[width*0.60, width*0.40])
    total.setStyle(TableStyle([('BOX',(0,0),(-1,-1),1,colors.black), ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                              ('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),
                              ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10)]))
    story.extend([total, Spacer(1, 5*mm), paragraph(f'Payment Status: {statement.status}', strong),
                  Spacer(1, 3*mm), paragraph('Please settle your balance on or before the due date.'), Spacer(1, 3*mm)])
    if statement.previous_balance:
        story.append(paragraph(f'Includes unpaid earlier periods as of {date.today().isoformat()}. '
                               'Earlier balances retain their original due dates. Payment status covers all balances on this notice.', small))
    story.extend([Spacer(1, 6*mm), paragraph('Prepared by: Boarding House Management'), Spacer(1, 5*mm),
                  paragraph('Tenant Signature: __________________________'), Spacer(1, 4*mm),
                  paragraph('Date Received: __________________________')])

    return story


def _write_pdf(house, statements, basename):
    regular, bold = _pdf_fonts()
    directory = house.ledger.filepath.parent / 'reports'
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / f'{basename}.pdf'
    index = 2
    while output.exists():
        output = directory / f'{basename}_{index}.pdf'
        index += 1
    story = []
    for statement in statements:
        if story:
            story.append(PageBreak())
        # Bound each tenant's entire notice to one printable page, including long names.
        story.append(KeepInFrame(A4[0]-40*mm-12, A4[1]-37*mm-12,
                                _statement_flowables(statement, regular, bold), mode='shrink'))

    def footer(canvas, doc):
        canvas.setFont(regular, 8)
        canvas.drawString(20*mm, 12*mm, f'BoardEase | Generated {date.today().isoformat()}')
        canvas.drawRightString(A4[0]-20*mm, 12*mm, f'Page {doc.page}')

    descriptor, temporary = tempfile.mkstemp(suffix='.pdf', dir=directory)
    os.close(descriptor)
    try:
        document = SimpleDocTemplate(temporary, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm,
                                     topMargin=17*mm, bottomMargin=20*mm, title='BoardEase Billing Notice', author='BoardEase')
        document.build(story, onFirstPage=footer, onLaterPages=footer)
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return output


def open_pdf(path):
    path = Path(path).resolve()
    if not path.is_file() or path.suffix.lower() != '.pdf':
        raise ValueError('Generate a PDF first, or regenerate it if the file was moved.')
    if os.name != 'nt':
        raise OSError(f'Open this PDF in your system viewer: {path}')
    os.startfile(str(path), 'open')


def print_pdf(path):
    path = Path(path).resolve()
    if not path.is_file() or path.suffix.lower() != '.pdf':
        raise ValueError('Generate a PDF first, or regenerate it if the file was moved.')
    if os.name != 'nt':
        raise OSError('Use Open PDF and print from your PDF viewer.')
    try:
        os.startfile(str(path), 'print')
    except OSError as error:
        raise OSError('Your default PDF viewer does not support Windows Print. Use Open PDF, then Ctrl+P in the viewer.') from error
