public class TestListOperations {
    static void testListOperations() {
        List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
        System.assertEquals(5, numbers.size(), 'List should have 5 elements');
        System.assertEquals(1, numbers[0], 'First element should be 1');
        System.assertEquals(5, numbers[4], 'Last element should be 5');
    }
}
