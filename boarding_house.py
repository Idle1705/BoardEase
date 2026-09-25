from bill import Bill
from payment import Payment
from notification import Notification
from excel_ledger import ExcelLedger
from single_room import SingleRoom
from shared_room import SharedRoom
from tenant import Tenant


class BoardingHouse:
    def __init__(self, owner, ledger_filepath="billing_ledger.xlsx"):
        self.owner = owner
        self.rooms = []
        self.bills = []
        self.payments = []
        self.notifications = []
        self.ledger = ExcelLedger(ledger_filepath)
        self._load_from_ledger()

    # ------------------------------------------------------------------
    # Setup: rooms & tenants
    # ------------------------------------------------------------------
    def add_room(self, room, log=True):
        self.rooms.append(room)
        if log:
            self.ledger.add_room(room)

    def add_tenant(self, tenant, room, log=True):
        room.add_tenant(tenant)
        if log:
            self.ledger.add_tenant(tenant, room)

    def find_room(self, room_number):
        for room in self.rooms:
            if room.room_number == room_number:
                return room
        return None

    def find_tenant(self, name):
        for room in self.rooms:
            for tenant in room.tenants:
                if tenant.name == name:
                    return tenant
        return None

    def _load_from_ledger(self):
        """Rebuilds rooms, tenants, and bill/payment history from the
        Excel file, so the app doesn't start empty every time."""

        # Rooms
        for row in self.ledger.load_rooms():
            if row["type"] == "SharedRoom":
                room = SharedRoom(row["room_number"], row["base_rent"], row["max_occupancy"])
            else:
                room = SingleRoom(row["room_number"], row["base_rent"])
            self.add_room(room, log=False)

        # Tenants (assigned to the rooms just rebuilt)
        for row in self.ledger.load_tenants():
            room = self.find_room(row["room_number"])
            if room is None:
                continue
            tenant = Tenant(row["name"], row["contact_number"])
            self.add_tenant(tenant, room, log=False)

        # Bills (and payments, for bills already marked PAID)
        for row in self.ledger.load_bills():
            tenant = self.find_tenant(row["tenant_name"])
            if tenant is None:
                continue
            bill = Bill(
                tenant,
                row["month"],
                row["rent_share"],
                row["utility_share"],
                row["due_date"],
            )
            self.bills.append(bill)

            if row["status"] == "PAID" and row["amount_paid"]:
                payment = Payment(bill, row["amount_paid"], row["date_paid"] or "")
                self.payments.append(payment)
            # Note: reminders aren't re-queued for bills loaded from history.

    # ------------------------------------------------------------------
    # Billing
    # ------------------------------------------------------------------
    def generate_bills_for_room(self, reading, due_date: str):
        """Generates one bill per tenant in a room, based on a utility reading,
        and queues a payment reminder for each."""
        generated = []
        room = reading.room

        for tenant in room.tenants:
            bill = Bill(
                tenant,
                reading.month,
                room.get_rent_share_per_tenant(),
                reading.get_utility_share_per_tenant(),
                due_date
            )
            self.bills.append(bill)
            generated.append(bill)
            self.ledger.add_bill(bill)  # logs the bill into Excel as soon as it's generated

            reminder = Notification.create_reminder(bill)
            self.notifications.append(reminder)

        return generated

    def record_payment(self, bill, amount: float, date_paid: str):
        payment = Payment(bill, amount, date_paid)  # this line sets bill.paid = True internally
        self.payments.append(payment)
        self.ledger.record_payment(bill, payment)   # updates the Excel row's balance once PAID
        return payment

    def check_overdue_bills(self, current_date: str):
        """Checks all unpaid bills and sends overdue notifications."""
        for bill in self.bills:
            if not bill.paid and bill.due_date < current_date:
                alert = Notification.create_overdue_alert(bill)
                self.notifications.append(alert)
                alert.send()

    def send_all_reminders(self):
        for n in self.notifications:
            if n.type == "REMINDER":
                n.send()

    def print_tenant_dashboard(self, tenant):
        print(f"--- Dashboard: {tenant.name} ---")
        if tenant.assigned_room is not None:
            print(f"Room: {tenant.assigned_room}")
        for bill in self.bills:
            if bill.tenant is tenant:
                print(bill)

    def print_owner_dashboard(self):
        print(f"--- Dashboard: {self.owner.name} (Owner) ---")
        for room in self.rooms:
            print(room)
        print("All bills:")
        for bill in self.bills:
            print(f"  {bill}")