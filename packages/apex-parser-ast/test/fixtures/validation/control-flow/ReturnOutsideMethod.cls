public class ReturnOutsideMethod {
    public Integer myField = 10;
    
    {
        return; // Invalid: return outside method/constructor
    }
}
