public class DeprecatedValid {
    @Deprecated
    public void oldMethod() {
    }

    @Deprecated(message='Use newMethod instead')
    public void anotherOldMethod() {
    }
}
