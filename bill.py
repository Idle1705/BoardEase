class Bill:
    def __init__(self, tenant, month: str, rent_share: float, utility_share: float, due_date: str):
        self.tenant = tenant
        self.month = month
        self.rent_share = rent_share
        self.utility_share = utility_share
        self.due_date = due_date
        self.paid = False

    def get_total_amount(self) -> float:
        return self.rent_share + self.utility_share

    def mark_as_paid(self):
        self.paid = True

    def __str__(self):
        status = "PAID" if self.paid else "UNPAID"
        return (f"Bill[{self.month}, {self.tenant.name}]: P{self.get_total_amount():.2f} "
                f"(rent P{self.rent_share:.2f} + utilities P{self.utility_share:.2f}), "
                f"due {self.due_date}, {status}")
