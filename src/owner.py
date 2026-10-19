from person import Person


class Owner(Person):
    def get_role(self) -> str:
        return "Owner"
