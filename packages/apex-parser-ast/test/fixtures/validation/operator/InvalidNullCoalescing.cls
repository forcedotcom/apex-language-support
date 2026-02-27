public class InvalidNullCoalescing {
    public void testInvalidNullCoalescing() {
        String str = 'test';
        Integer num = 5;
        
        // Error: Incompatible types in null coalescing
        String result = str ?? num;
    }
}
