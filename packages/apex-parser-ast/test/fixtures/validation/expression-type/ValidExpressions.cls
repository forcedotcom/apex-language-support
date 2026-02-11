public class ValidExpressions {
    public void method() {
        // Valid: method calls
        doSomething();
        
        // Valid: assignments
        Integer x = 5;
        x = 10;
        
        // Valid: increment/decrement
        x++;
        ++x;
        
        // Valid: boolean conditions
        Boolean flag = true;
        if (flag) {
        }
        if (x == 5) {
        }
        while (flag) {
        }
    }
    
    private void doSomething() {
    }
}
