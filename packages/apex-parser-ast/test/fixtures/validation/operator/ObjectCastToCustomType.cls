public class ObjectCastToCustomType {
    public class Widget {}

    public void castObject(Object raw) {
        Widget casted = (Widget) raw;
        Decimal decimalValue = (Decimal) raw;
    }
}
