class Notification:
    def __init__(self, tenant, message: str, notif_type: str):
        self.tenant = tenant
        self.message = message
        self.type = notif_type  # "REMINDER" or "OVERDUE"

    def send(self):
        # In a full system, this would push to an app dashboard, SMS, or email.
        # For this course project, we simulate it by printing to console.
        print(f"[{self.type} -> {self.tenant.name}] {self.message}")

    @staticmethod
    def create_reminder(bill):
        msg = (f"Your bill for {bill.month} (P{bill.get_total_amount():.2f}) "
               f"is due on {bill.due_date}.")
        return Notification(bill.tenant, msg, "REMINDER")

    @staticmethod
    def create_overdue_alert(bill):
        msg = (f"Your bill for {bill.month} (P{bill.get_total_amount():.2f}) "
               f"is overdue since {bill.due_date}.")
        return Notification(bill.tenant, msg, "OVERDUE")
