from abc import ABC, abstractmethod


class Room(ABC):
    def __init__(self, room_number: str, base_rent: float):
        self.room_number = room_number
        self.base_rent = base_rent
        self.tenants = []

    @abstractmethod
    def get_max_occupancy(self) -> int:
        pass

    def add_tenant(self, tenant):
        self.tenants.append(tenant)
        tenant.assigned_room = self

    def get_rent_share_per_tenant(self) -> float:
        if not self.tenants:
            return self.base_rent
        return self.base_rent / len(self.tenants)

    def __str__(self):
        return (f"Room {self.room_number} ({type(self).__name__}, "
                f"{len(self.tenants)}/{self.get_max_occupancy()} occupied)")
