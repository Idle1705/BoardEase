from abc import ABC, abstractmethod


class Person(ABC):
    def __init__(self, name: str, contact_number: str):
        self.name = name
        self.contact_number = contact_number

    @abstractmethod
    def get_role(self) -> str:
        pass

    def __str__(self):
        return f"{self.get_role()}: {self.name} ({self.contact_number})"
