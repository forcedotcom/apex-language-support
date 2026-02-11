public class ForLoopConditions {
    public void method() {
        Integer i = 0;
        Boolean flag = true;
        String s = "test";
        
        // Valid: boolean condition
        for (; flag; ) {
        }
        
        // Valid: numeric condition (allowed in Apex)
        for (; i < 10; ) {
        }
        
        // Invalid: string condition
        for (; s; ) {
        }
    }
}
