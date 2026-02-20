public class InvalidDmlStatements {
    public void testInvalidDml() {
        String str = 'test';
        insert str; // Error: String is not SObject
        
        Integer num = 5;
        update num; // Error: Integer is not SObject
        
        List<String> strings = new List<String>();
        delete strings; // Error: List<String> is not SObject list
        
        Boolean flag = true;
        undelete flag; // Error: Boolean is not SObject
        
        Map<String, String> mapObj = new Map<String, String>();
        upsert mapObj; // Error: Map is not SObject
    }
}
