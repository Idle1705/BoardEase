class Payment:
    def __init__(self, bill, amount_paid: float, date_paid: str):
        self.bill = bill
        self.amount_paid = amount_paid
        self.date_paid = date_paid
        bill.mark_as_paid()

    def __str__(self):
        return (f"Payment[{self.bill.tenant.name}, {self.bill.month}]: "
                f"P{self.amount_paid:.2f} on {self.date_paid}")
