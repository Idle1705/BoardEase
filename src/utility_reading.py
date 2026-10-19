from bill import money


class UtilityReading:
    def __init__(self, room, month: str, electricity_kwh: float, water_cubic_m: float,
                 electricity_rate_per_kwh: float, water_rate_per_cubic_m: float):
        self.room = room
        self.month = month
        self.electricity_kwh = electricity_kwh
        self.water_cubic_m = water_cubic_m
        self.electricity_rate_per_kwh = electricity_rate_per_kwh
        self.water_rate_per_cubic_m = water_rate_per_cubic_m

    def get_total_utility_cost(self) -> float:
        return (self.electricity_kwh * self.electricity_rate_per_kwh +
                self.water_cubic_m * self.water_rate_per_cubic_m)

    def get_utility_share_per_tenant(self) -> float:
        occupants = len(self.room.tenants)
        if occupants == 0:
            return self.get_total_utility_cost()
        return self.get_total_utility_cost() / occupants

    def allocate_charges(self):
        """Divide whole cents fairly; the shares add up to each room charge."""
        count = len(self.room.tenants)
        if not count:
            raise ValueError('The room must have tenants before billing.')
        def split(amount):
            cents = int(round(money(amount) * 100))
            share, remainder = divmod(cents, count)
            return [(share + (index < remainder)) / 100 for index in range(count)]
        return list(zip(split(self.room.base_rent),
                        split(self.electricity_kwh * self.electricity_rate_per_kwh),
                        split(self.water_cubic_m * self.water_rate_per_cubic_m)))

    def __str__(self):
        return (f"Utility[{self.month}, Room {self.room.room_number}]: "
                f"{self.electricity_kwh} kWh, {self.water_cubic_m} cu.m -> "
                f"total P{self.get_total_utility_cost():.2f}")
