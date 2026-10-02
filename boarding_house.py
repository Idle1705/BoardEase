from datetime import datetime
from bill import Bill, BillingStatement, billing_month, money, iso_date
from payment import Payment
from notification import Notification
from excel_ledger import ExcelLedger
from single_room import SingleRoom
from shared_room import SharedRoom
from tenant import Tenant


class BoardingHouse:
    def __init__(self, owner, ledger_filepath='billing_ledger.xlsx'):
        self.owner = owner
        self.rooms = []
        self.bills = []
        self.payments = []
        self.notifications = []
        self.archived_tenants = []
        self.ledger = ExcelLedger(ledger_filepath)
        self._load_from_ledger()

    @property
    def tenants(self):
        return [t for r in self.rooms for t in r.tenants]

    @property
    def all_tenants(self):
        return self.tenants + self.archived_tenants

    def add_room(self, room, log=True):
        room.room_number = str(room.room_number).strip()
        if not room.room_number:
            raise ValueError('Room number is required.')
        if self.find_room(room.room_number):
            raise ValueError('This room number already exists.')
        room.base_rent = money(room.base_rent)
        capacity = room.get_max_occupancy()
        if not isinstance(capacity, int) or capacity < 1:
            raise ValueError('Shared room capacity must be a positive whole number.')
        if log:
            self.ledger.add_room(room)
        self.rooms.append(room)

    def add_tenant(self, tenant, room, log=True):
        if room not in self.rooms:
            raise ValueError('Select a valid room.')
        tenant.name = tenant.name.strip()
        tenant.contact_number = tenant.contact_number.strip()
        if not tenant.name or (log and not tenant.contact_number):
            raise ValueError('Name and contact number are required.')
        if self.find_tenant(tenant.name):
            raise ValueError('A tenant with this name already exists. Use a distinct full name.')
        if tenant.assigned_room is not None or len(room.tenants) >= room.get_max_occupancy():
            raise ValueError('This room is full or the tenant is already assigned.')
        if log:
            self.ledger.add_tenant(tenant, room)
        room.add_tenant(tenant)

    def find_room(self, room_number):
        return next((r for r in self.rooms if str(r.room_number).casefold() ==
                     str(room_number).strip().casefold()), None)

    def find_tenant(self, name):
        return next((t for t in self.all_tenants if t.name.casefold() == str(name).strip().casefold()), None)

    def edit_room(self, room, rent, capacity):
        if room not in self.rooms:
            raise ValueError('Select a room first.')
        rent = money(rent)
        if not isinstance(capacity, int) or capacity < max(1, len(room.tenants)):
            raise ValueError('Capacity must be a whole number and cannot be below current occupancy.')
        if isinstance(room, SingleRoom) and capacity != 1:
            raise ValueError('A single room has capacity 1.')
        self.ledger.update_room(room, rent, capacity)
        room.base_rent = rent
        if isinstance(room, SharedRoom):
            room.max_occupancy = capacity

    def edit_tenant(self, tenant, name, contact):
        if tenant not in self.all_tenants:
            raise ValueError('Select a tenant first.')
        name, contact = name.strip(), contact.strip()
        if not name or not contact:
            raise ValueError('Name and contact number are required.')
        existing = self.find_tenant(name)
        if existing is not None and existing is not tenant:
            raise ValueError('A tenant with this name already exists.')
        self.ledger.update_tenant(tenant, name=name, contact=contact)
        tenant.name, tenant.contact_number = name, contact

    def transfer_tenant(self, tenant, room):
        if tenant not in self.tenants or room not in self.rooms:
            raise ValueError('Select an active tenant and a valid room.')
        if room is tenant.assigned_room:
            raise ValueError('The tenant already occupies this room.')
        if len(room.tenants) >= room.get_max_occupancy():
            raise ValueError('The selected room is full.')
        self.ledger.update_tenant(tenant, room=room.room_number)
        tenant.assigned_room.tenants.remove(tenant)
        room.add_tenant(tenant)

    def remove_tenant(self, tenant):
        if tenant not in self.tenants:
            raise ValueError('Select an active tenant first.')
        self.ledger.update_tenant(tenant, active=False)
        tenant.last_room_number = tenant.assigned_room.room_number
        tenant.assigned_room.tenants.remove(tenant)
        tenant.assigned_room = None
        tenant.active = False
        self.archived_tenants.append(tenant)

    def _load_from_ledger(self):
        for row in self.ledger.load_rooms():
            room = (SharedRoom(row['room_number'], row['base_rent'], int(row['max_occupancy']))
                    if row['type'] == 'SharedRoom' else SingleRoom(row['room_number'], row['base_rent']))
            self.add_room(room, log=False)
        for row in self.ledger.load_tenants():
            room = self.find_room(row['room_number'])
            if room is None:
                raise ValueError(f"Tenant {row['name']} refers to a missing room.")
            tenant = Tenant(row['name'], row['contact_number'])
            if row['active']:
                self.add_tenant(tenant, room, log=False)
            else:
                tenant.active = False
                tenant.last_room_number = row['room_number']
                self.archived_tenants.append(tenant)
        for row in self.ledger.load_bills():
            tenant = self.find_tenant(row['tenant_name'])
            if tenant is None:
                raise ValueError(f"Bill refers to missing tenant {row['tenant_name']}.")
            self.bills.append(Bill(tenant, row['month'], row['rent_share'], row['utility_share'],
                                   row['due_date'], bill_id=row['bill_id'],
                                   amount_paid=0, room_number=row['room_number'],
                                   electricity_share=row['electricity_share'], water_share=row['water_share']))
        bills = {b.bill_id: b for b in self.bills}
        if len(bills) != len(self.bills):
            raise ValueError('Duplicate Bill IDs were found. Restore or review the ledger before continuing.')
        for row in self.ledger.load_payments():
            if row['bill_id'] not in bills:
                raise ValueError('A payment refers to a missing bill.')
            bill = bills[row['bill_id']]
            payment = Payment(bill, row['amount_paid'], row['date_paid'], apply=False, source=row['source'])
            bill.amount_paid = money(bill.amount_paid + payment.amount_paid)
            payment.remaining_balance = bill.balance
            self.payments.append(payment)

    def generate_bills_for_room(self, reading, due_date: str):
        room = reading.room
        if room not in self.rooms or not room.tenants:
            raise ValueError('Select an occupied room.')
        try:
            month = datetime.strptime(reading.month, '%Y-%m').strftime('%Y-%m')
        except ValueError:
            raise ValueError('Enter the billing month as YYYY-MM.') from None
        due_date = iso_date(due_date)
        for field in ('electricity_kwh', 'water_cubic_m', 'electricity_rate_per_kwh', 'water_rate_per_cubic_m'):
            money(getattr(reading, field))
        if any(b.tenant in room.tenants and b.month[:7] == month for b in self.bills):
            raise ValueError('Bills already exist for a tenant in this room for that month.')
        generated = [Bill(t, month, rent, money(electricity + water), due_date,
                          electricity_share=electricity, water_share=water)
                     for t, (rent, electricity, water) in zip(room.tenants, reading.allocate_charges())]
        self.ledger.add_bills(generated)
        self.bills.extend(generated)
        self.notifications.extend(Notification.create_reminder(b) for b in generated)
        return generated

    def record_payment(self, bill, amount: float, date_paid: str):
        if bill not in self.bills:
            raise ValueError('Select a bill from this boarding house.')
        previous = bill.amount_paid
        try:
            payment = Payment(bill, amount, date_paid)
            self.ledger.record_payment(bill, payment)
        except Exception:
            bill.amount_paid = previous
            raise
        self.payments.append(payment)
        return payment

    def check_overdue_bills(self, current_date: str, send=True):
        current_date = iso_date(current_date)
        overdue = [b for b in self.bills if b.get_status(current_date) == 'OVERDUE']
        for bill in overdue:
            alert = Notification.create_overdue_alert(bill)
            if send:
                alert.send()
        return overdue

    def send_all_reminders(self, send=True):
        reminders = [Notification.create_reminder(b) for b in self.bills if not b.paid]
        self.notifications = reminders
        if send:
            for reminder in reminders:
                reminder.send()
        return reminders

    def summary(self, tenant=None):
        bills = [b for b in self.bills if tenant is None or b.tenant is tenant]
        return dict(total_billed=money(sum(b.get_total_amount() for b in bills)),
                    total_paid=money(sum(b.amount_paid for b in bills)),
                    balance=money(sum(b.balance for b in bills)), bills=len(bills),
                    paid=sum(b.paid for b in bills), unpaid=sum(not b.paid for b in bills),
                    partial=sum(b.amount_paid > 0 and not b.paid for b in bills),
                    overdue=sum(b.get_status() == 'OVERDUE' for b in bills))

    def get_tenant_bills(self, tenant, month=None):
        return [b for b in self.bills if b.tenant is tenant and
                (month is None or billing_month(b.month) == billing_month(month))]

    def billing_months(self, tenant=None):
        return sorted({billing_month(b.month) for b in self.bills if tenant is None or b.tenant is tenant}, reverse=True)

    def get_statement(self, tenant, month):
        if tenant not in self.all_tenants:
            raise ValueError('Select a registered tenant.')
        selected = self.get_tenant_bills(tenant, month)
        if not selected:
            raise ValueError('No bill exists for this tenant and month.')
        if len(selected) != 1:
            raise ValueError('Multiple bills exist for this tenant and month. Review duplicate records before printing.')
        previous = tuple(b for b in self.get_tenant_bills(tenant)
                         if billing_month(b.month) < billing_month(month) and b.balance > 0)
        return BillingStatement(selected[0], previous)

    def filter_bills(self, status='All', search=''):
        query = search.strip().casefold()
        return [b for b in self.bills if
                (not query or query in b.tenant.name.casefold() or query in b.room_number.casefold()) and
                (status == 'All' or (status == 'Unpaid' and not b.paid) or
                 (status == 'Partial' and b.amount_paid > 0 and not b.paid) or
                 b.get_status() == status.upper())]

    def print_tenant_dashboard(self, tenant):
        print(f'--- Dashboard: {tenant.name} ---')
        if tenant.assigned_room is not None:
            print(f'Room: {tenant.assigned_room}')
        for bill in self.bills:
            if bill.tenant is tenant:
                print(bill)

    def print_owner_dashboard(self):
        print(f'--- Dashboard: {self.owner.name} (Owner) ---')
        for room in self.rooms:
            print(room)
        for bill in self.bills:
            print(bill)
