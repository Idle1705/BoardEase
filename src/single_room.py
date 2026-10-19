from room import Room


class SingleRoom(Room):
    def get_max_occupancy(self) -> int:
        return 1
