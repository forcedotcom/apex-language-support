public class NameValuePairInvalid {
    public void m() {
        // Error: name=value pairs only allowed for SObjects
        String s = new String(value='test');
    }
}
