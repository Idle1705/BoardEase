from room import Room


class SharedRoom(Room):
    def __init__(self, room_number: str, base_rent: float, max_occupancy: int):
        super().__init__(room_number, base_rent)
        self.max_occupancy = max_occupancy

    def get_max_occupancy(self) -> int:
        return self.max_occupancy
