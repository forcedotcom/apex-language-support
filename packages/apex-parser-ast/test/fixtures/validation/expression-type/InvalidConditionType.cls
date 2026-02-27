public class InvalidConditionType {
    public void method() {
        Integer x = 5;
        if (x) { // Error: non-boolean condition
        }
        while (x) { // Error: non-boolean condition
        }
    }
}
