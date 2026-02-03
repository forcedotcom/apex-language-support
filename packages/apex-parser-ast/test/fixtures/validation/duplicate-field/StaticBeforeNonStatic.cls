public class StaticBeforeNonStatic {
    public static String myField; // Static first - NOT allowed
    public Integer myField; // Non-static after static - should error
}
