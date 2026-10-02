"""Append-only schema migration, atomic writes, and persistent payment transactions."""
import os
import shutil
import tempfile
from contextlib import contextmanager
from datetime import datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from hashlib import sha256
from openpyxl import Workbook, load_workbook
from bill import money


class ExcelLedger:
    ROOM_HEADERS = ['Room Number', 'Type', 'Base Rent', 'Max Occupancy']
    TENANT_HEADERS = ['Name', 'Contact Number', 'Room Number', 'Active']
    BILLING_HEADERS = ['Tenant', 'Room', 'Month', 'Rent Share', 'Utility Share',
                       'Total Amount', 'Due Date', 'Amount Paid', 'Date Paid',
                       'Balance', 'Status', 'Bill ID', 'Electricity Share', 'Water Share']
    PAYMENT_HEADERS = ['Bill ID', 'Amount', 'Date Paid', 'Remaining Balance', 'Source']
    SCHEMA = {'Rooms': ROOM_HEADERS, 'Tenants': TENANT_HEADERS,
              'Billing': BILLING_HEADERS, 'Payments': PAYMENT_HEADERS}

    def __init__(self, filepath='billing_ledger.xlsx'):
        self.filepath = Path(filepath).resolve()
        self.backup_path = None
        self._disk_hash = self._fingerprint()
        exists = self.filepath.exists()
        if exists:
            self.workbook = load_workbook(self.filepath)
            for name, headers in [('Rooms', self.ROOM_HEADERS), ('Tenants', self.TENANT_HEADERS[:3]),
                                  ('Billing', self.BILLING_HEADERS[:11])]:
                if name not in self.workbook.sheetnames:
                    raise ValueError(f'The ledger is missing {name}. Original file was not changed.')
                if [c.value for c in self.workbook[name][1]][:len(headers)] != headers:
                    raise ValueError(f'Unsupported {name} headers. Original file was not changed.')
            if 'Payments' in self.workbook.sheetnames:
                if [c.value for c in self.workbook['Payments'][1]][:5] != self.PAYMENT_HEADERS:
                    raise ValueError('Unsupported Payments headers. Original file was not changed.')
        else:
            self.workbook = Workbook()
            self.workbook.remove(self.workbook.active)
            for name, headers in self.SCHEMA.items():
                self.workbook.create_sheet(name).append(headers)
        needs_migration = exists and any(name not in self.workbook.sheetnames or
            any(header not in [c.value for c in self.workbook[name][1]] for header in headers)
            for name, headers in self.SCHEMA.items())
        if needs_migration:
            directory = self.filepath.parent / 'backups'
            directory.mkdir(exist_ok=True)
            self.backup_path = directory / f'{self.filepath.stem}_{datetime.now():%Y%m%d_%H%M%S_%f}.xlsx'
            shutil.copy2(self.filepath, self.backup_path)
            self._migrate()
        self._bind_sheets()
        if needs_migration or not exists:
            self._save()

    def _fingerprint(self):
        return sha256(self.filepath.read_bytes()).digest() if self.filepath.exists() else None

    def _bind_sheets(self):
        self.rooms_sheet = self.workbook['Rooms']
        self.tenants_sheet = self.workbook['Tenants']
        self.billing_sheet = self.workbook['Billing']
        self.columns = {name: {cell.value: cell.column for cell in self.workbook[name][1]}
                        for name in self.SCHEMA}

    def _migrate(self):
        had_payments = 'Payments' in self.workbook.sheetnames
        for name, headers in self.SCHEMA.items():
            if name not in self.workbook.sheetnames:
                self.workbook.create_sheet(name).append(headers)
                continue
            sheet = self.workbook[name]
            existing = [c.value for c in sheet[1]]
            for header in headers:
                if header not in existing:
                    sheet.cell(1, sheet.max_column + 1, header)
        self._bind_sheets()
        for row in range(2, self.tenants_sheet.max_row + 1):
            if self.tenants_sheet.cell(row, 1).value is not None:
                cell = self.tenants_sheet.cell(row, self.columns['Tenants']['Active'])
                if cell.value is None:
                    cell.value = True
        for row in range(2, self.billing_sheet.max_row + 1):
            if self.billing_sheet.cell(row, 1).value is None:
                continue
            identity = self.billing_sheet.cell(row, self.columns['Billing']['Bill ID'])
            identity.value = identity.value or uuid4().hex
            # Original columns and legacy combined utilities stay intact.
            if not had_payments:
                paid = money(self.billing_sheet.cell(row, 8).value or 0)
                if paid:
                    total = money(self.billing_sheet.cell(row, 6).value)
                    self.workbook['Payments'].append([identity.value, paid,
                        self.billing_sheet.cell(row, 9).value, money(max(0, total-paid)), 'Legacy total'])

    def _save(self):
        if self._fingerprint() != self._disk_hash:
            raise OSError('The ledger changed outside this app. Restart BoardEase before saving to preserve those changes.')
        text_fields = {'Rooms': ['Room Number', 'Type'], 'Tenants': ['Name', 'Contact Number', 'Room Number'],
                       'Billing': ['Tenant', 'Room', 'Month', 'Due Date', 'Date Paid', 'Status', 'Bill ID'],
                       'Payments': ['Bill ID', 'Date Paid', 'Source']}
        for name, fields in text_fields.items():
            for row in range(2, self.workbook[name].max_row + 1):
                for field in fields:
                    cell = self.workbook[name].cell(row, self.columns[name][field])
                    if isinstance(cell.value, str):
                        cell.data_type = 's'
        descriptor, filename = tempfile.mkstemp(suffix='.tmp', dir=self.filepath.parent)
        os.close(descriptor)
        try:
            self.workbook.save(filename)
            os.replace(filename, self.filepath)
            self._disk_hash = self._fingerprint()
        finally:
            if os.path.exists(filename):
                os.unlink(filename)

    @contextmanager
    def _transaction(self):
        snapshot = BytesIO()
        self.workbook.save(snapshot)
        try:
            yield
            self._save()
        except Exception:
            snapshot.seek(0)
            self.workbook = load_workbook(snapshot)
            self._bind_sheets()
            raise

    def _append(self, name, values):
        row = self.workbook[name].max_row + 1
        for field, value in values.items():
            if value is not None:
                self.workbook[name].cell(row, self.columns[name][field], value)

    def _rows(self, name):
        return [{key: row[index-1] for key, index in self.columns[name].items()}
                for row in self.workbook[name].iter_rows(min_row=2, values_only=True) if row[0] is not None]

    def add_room(self, room):
        with self._transaction():
            self._append('Rooms', dict(zip(self.ROOM_HEADERS,
                         [room.room_number, type(room).__name__, room.base_rent, room.get_max_occupancy()])))

    def load_rooms(self):
        return [dict(room_number=str(r['Room Number']), type=r['Type'], base_rent=r['Base Rent'],
                     max_occupancy=r['Max Occupancy']) for r in self._rows('Rooms')]

    def add_tenant(self, tenant, room):
        with self._transaction():
            self._append('Tenants', dict(zip(self.TENANT_HEADERS, [tenant.name, tenant.contact_number, room.room_number, True])))

    def load_tenants(self):
        return [dict(name=str(r['Name']), contact_number=str(r['Contact Number'] or ''),
                     room_number=str(r['Room Number']), active=r['Active'] not in (False, 0, 'False', 'FALSE'))
                for r in self._rows('Tenants')]

    def update_room(self, room, rent, capacity):
        with self._transaction():
            for row in self.rooms_sheet.iter_rows(min_row=2):
                if str(row[0].value) == room.room_number:
                    row[2].value, row[3].value = rent, capacity
                    return
            raise ValueError('Room was not found in the ledger.')

    def update_tenant(self, tenant, *, name=None, contact=None, room=None, active=None):
        with self._transaction():
            matched = False
            for row in range(2, self.tenants_sheet.max_row + 1):
                if self.tenants_sheet.cell(row, 1).value == tenant.name:
                    updates = {'Name': name, 'Contact Number': contact, 'Room Number': room, 'Active': active}
                    for field, value in updates.items():
                        if value is not None:
                            self.tenants_sheet.cell(row, self.columns['Tenants'][field], value)
                    matched = True
                    break
            if not matched:
                raise ValueError('Tenant was not found in the ledger.')
            if name is not None:
                for row in self.billing_sheet.iter_rows(min_row=2):
                    if row[0].value == tenant.name:
                        row[0].value = name

    def add_bill(self, bill):
        self.add_bills([bill])

    def add_bills(self, bills):
        with self._transaction():
            for b in bills:
                self._append('Billing', dict(zip(self.BILLING_HEADERS, [b.tenant.name, b.room_number, b.month,
                    b.rent_share, b.utility_share, b.get_total_amount(), b.due_date, b.amount_paid, '',
                    b.balance, b.get_status(), b.bill_id, b.electricity_share, b.water_share])))

    def record_payment(self, bill, payment):
        with self._transaction():
            id_column = self.columns['Billing']['Bill ID']
            row = next((r for r in range(2, self.billing_sheet.max_row + 1)
                        if self.billing_sheet.cell(r, id_column).value == bill.bill_id), None)
            if row is None:
                raise ValueError('Bill was not found in the ledger.')
            for field, value in {'Amount Paid': bill.amount_paid, 'Date Paid': payment.date_paid,
                                 'Balance': bill.balance, 'Status': bill.get_status()}.items():
                self.billing_sheet.cell(row, self.columns['Billing'][field], value)
            self._append('Payments', dict(zip(self.PAYMENT_HEADERS,
                [bill.bill_id, payment.amount_paid, payment.date_paid, payment.remaining_balance, payment.source])))

    def load_bills(self):
        keys = ['tenant_name', 'room_number', 'month', 'rent_share', 'utility_share', 'total_amount',
                'due_date', 'amount_paid', 'date_paid', 'balance', 'status', 'bill_id', 'electricity_share', 'water_share']
        return [dict(zip(keys, [r[h] for h in self.BILLING_HEADERS])) for r in self._rows('Billing')]

    def load_payments(self):
        keys = ['bill_id', 'amount_paid', 'date_paid', 'remaining_balance', 'source']
        return [dict(zip(keys, [r[h] for h in self.PAYMENT_HEADERS])) for r in self._rows('Payments')]
