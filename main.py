from owner import Owner
from tenant import Tenant
from single_room import SingleRoom
from shared_room import SharedRoom
from utility_reading import UtilityReading
from boarding_house import BoardingHouse


def main():
    # Set up owner and boarding house
    owner = Owner("Mrs. Santos", "0917-000-0001")
    house = BoardingHouse(owner)

    # Set up rooms
    room_101 = SingleRoom("101", 3500.0)
    room_102 = SharedRoom("102", 6000.0, 3)
    house.add_room(room_101)
    house.add_room(room_102)

    # Set up tenants
    juan = Tenant("Juan Dela Cruz", "0917-111-1111")
    maria = Tenant("Maria Reyes", "0917-222-2222")
    pedro = Tenant("Pedro Ramos", "0917-333-3333")

    room_101.add_tenant(juan)
    room_102.add_tenant(maria)
    room_102.add_tenant(pedro)

    # Record utility usage for the month
    reading_101 = UtilityReading(room_101, "2026-09", 40, 5, 12.0, 30.0)
    reading_102 = UtilityReading(room_102, "2026-09", 90, 12, 12.0, 30.0)

    # Generate bills (this also queues payment reminders)
    room_101_bills = house.generate_bills_for_room(reading_101, "2026-09-15")
    room_102_bills = house.generate_bills_for_room(reading_102, "2026-09-15")

    print("=== Sending reminders ===")
    house.send_all_reminders()

    # Simulate Maria paying her bill on time
    print("\n=== Recording payment ===")
    maria_bill = room_102_bills[0]  # Maria was added first to room 102
    payment = house.record_payment(maria_bill, maria_bill.get_total_amount(), "2026-09-10")
    print(payment)

    print("\n=== Checking for overdue bills (after due date) ===")
    house.check_overdue_bills("2026-09-20")

    print("\n=== Tenant Dashboard: Juan ===")
    house.print_tenant_dashboard(juan)

    print("\n=== Owner Dashboard ===")
    house.print_owner_dashboard()


if __name__ == "__main__":
    main()
