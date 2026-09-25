from person import Person


class Tenant(Person):
    def __init__(self, name: str, contact_number: str):
        super().__init__(name, contact_number)
        self.assigned_room = None  # set by Room.add_tenant()

    def get_role(self) -> str:
        return "Tenant"
