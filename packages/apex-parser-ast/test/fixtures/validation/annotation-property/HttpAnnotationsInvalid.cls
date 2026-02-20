@RestResource(urlMapping='/api')
public class HttpAnnotationsInvalid {
    @HttpGet(invalidParam='test')
    public static String get() {
        return 'get';
    }

    @HttpPost(invalidParam='test')
    public static String post() {
        return 'post';
    }
}
