/**
 * Tests generic type parameter resolution for List.add() calls.
 * List<Coordinates>.add(coords) should validate that coords is assignable to Coordinates.
 */
public class ListAddGeneric {
    public class Coordinates {
        public Decimal lat;
        public Decimal lon;
    }

    public void testValidAdd() {
        List<Coordinates> coordinates = new List<Coordinates>();
        Coordinates coords = new Coordinates();
        coords.lat = 37.7749;
        coords.lon = -122.4194;
        coordinates.add(coords); // Should pass: coords is Coordinates
    }

    public void testInvalidAdd() {
        List<Coordinates> coordinates = new List<Coordinates>();
        String wrongType = 'invalid';
        // This should fail: String is not assignable to Coordinates
        // coordinates.add(wrongType); // Commented out - would cause compilation error
    }

    public void testListStringAdd() {
        List<String> strings = new List<String>();
        String s = 'hello';
        strings.add(s); // Should pass: s is String
    }

    public void testSetAdd() {
        Set<Integer> numbers = new Set<Integer>();
        Integer num = 42;
        numbers.add(num); // Should pass: num is Integer
    }
}
