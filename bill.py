"""Bill amounts and payment status, shared by the GUI and Excel storage."""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4
from dataclasses import dataclass


def money(value):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0:
            raise ValueError
        return float(amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        raise ValueError('Enter a finite, non-negative amount.') from None


def iso_date(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    try:
        return date.fromisoformat(str(value).strip()).isoformat()
    except ValueError:
        raise ValueError('Enter a valid date in YYYY-MM-DD format.') from None


def billing_month(value):
    try:
        return datetime.strptime(str(value)[:7], '%Y-%m').strftime('%Y-%m')
    except ValueError:
        raise ValueError('The recorded billing month must have a valid YYYY-MM period.') from None


@dataclass(frozen=True)
class BillingStatement:
    bill: object
    previous_bills: tuple

    @property
    def previous_balance(self):
        return money(sum(b.balance for b in self.previous_bills))

    @property
    def total_due(self):
        return money(self.bill.balance + self.previous_balance)

    @property
    def status(self):
        bills = (self.bill,) + self.previous_bills
        if self.total_due == 0:
            return 'PAID'
        if any(b.get_status() == 'OVERDUE' for b in bills):
            return 'OVERDUE'
        return 'PARTIAL' if any(b.amount_paid > 0 for b in bills) else 'UNPAID'


class Bill:
    def __init__(self, tenant, month: str, rent_share: float, utility_share: float,
                 due_date: str, *, bill_id=None, amount_paid=0, room_number=None,
                 electricity_share=None, water_share=None):
        self.tenant = tenant
        self.month = str(month)
        self.rent_share = money(rent_share)
        self.utility_share = money(utility_share)
        self.electricity_share = money(electricity_share) if electricity_share is not None else None
        self.water_share = money(water_share) if water_share is not None else None
        if self.has_utility_breakdown and money(self.electricity_share + self.water_share) != self.utility_share:
            raise ValueError('Stored utility components do not match the bill utility total.')
        self.due_date = iso_date(due_date)
        self.bill_id = bill_id or uuid4().hex
        self.amount_paid = money(amount_paid)
        self.room_number = str(room_number if room_number is not None else
                               tenant.assigned_room.room_number if tenant.assigned_room else '')

    def get_total_amount(self) -> float:
        return money(self.rent_share + self.utility_share)

    @property
    def has_utility_breakdown(self):
        return self.electricity_share is not None and self.water_share is not None

    def charge_lines(self):
        lines = [('Monthly Rent', self.rent_share)]
        if self.has_utility_breakdown:
            lines.extend([('Electricity', self.electricity_share), ('Water', self.water_share)])
        else:
            lines.append(('Utilities', self.utility_share))
        return lines

    @property
    def balance(self):
        return money(max(0, self.get_total_amount() - self.amount_paid))

    @property
    def paid(self):
        return self.amount_paid >= self.get_total_amount()

    def get_status(self, current_date=None):
        if self.paid:
            return 'PAID'
        if self.due_date < iso_date(current_date or date.today()):
            return 'OVERDUE'
        return 'PARTIAL' if self.amount_paid > 0 else 'UNPAID'

    def apply_payment(self, amount):
        amount = money(amount)
        if amount <= 0:
            raise ValueError('Payment must be at least 0.01.')
        if amount > self.balance:
            raise ValueError('Payment cannot exceed the remaining balance.')
        self.amount_paid = money(self.amount_paid + amount)

    def mark_as_paid(self):
        """Compatibility helper: settling a bill means its total has been paid."""
        self.amount_paid = self.get_total_amount()

    def __str__(self):
        return (f'Bill[{self.month}, {self.tenant.name}]: P{self.get_total_amount():.2f} '
                f'(rent P{self.rent_share:.2f} + utilities P{self.utility_share:.2f}), '
                f'due {self.due_date}, balance P{self.balance:.2f}, {self.get_status()}')
