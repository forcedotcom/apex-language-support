/**
 * Consumer that references the deprecated type - should report NOT_VISIBLE_MAX_VERSION when apiVersion >= 57
 */
public class DeprecatedRemoved57Consumer {
    public DeprecatedRemoved57 field;
    public void method(DeprecatedRemoved57 param) {
    }
}
