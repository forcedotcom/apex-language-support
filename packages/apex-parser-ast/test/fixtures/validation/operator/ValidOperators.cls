public class ValidOperators {
    public void testOperators() {
        Integer a = 5;
        Integer b = 10;
        Boolean result1 = a == b;
        Boolean result2 = a != b;
        Integer sum = a + b;
        Integer diff = a - b;
        Integer prod = a * b;
        Integer quot = a / b;
        Boolean andResult = true && false;
        Boolean orResult = true || false;
        String value = a > b ? 'greater' : 'less';
    }
}
