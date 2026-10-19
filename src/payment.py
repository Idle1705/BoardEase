from bill import money, iso_date


class Payment:
    def __init__(self, bill, amount_paid: float, date_paid: str, *, apply=True,
                 remaining_balance=None, source='Payment'):
        self.bill = bill
        self.amount_paid = money(amount_paid)
        if self.amount_paid <= 0:
            raise ValueError('Payments must be positive.')
        self.date_paid = iso_date(date_paid) if date_paid else ''
        if apply:
            if not self.date_paid:
                raise ValueError('Date paid is required.')
            bill.apply_payment(self.amount_paid)
        self.remaining_balance = bill.balance if remaining_balance is None else money(remaining_balance)
        self.source = source

    @property
    def status(self):
        return 'PAID' if self.remaining_balance == 0 else 'PARTIAL'

    def __str__(self):
        return (f'Payment[{self.bill.tenant.name}, {self.bill.month}]: '
                f'P{self.amount_paid:.2f} on {self.date_paid}')
