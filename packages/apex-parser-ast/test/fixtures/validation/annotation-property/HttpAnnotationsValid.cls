@RestResource(urlMapping='/api')
public class HttpAnnotationsValid {
    @HttpGet
    public static String get() {
        return 'get';
    }

    @HttpPost
    public static String post() {
        return 'post';
    }

    @HttpPut
    public static String put() {
        return 'put';
    }

    @HttpDelete
    public static String delete() {
        return 'delete';
    }

    @HttpPatch
    public static String patch() {
        return 'patch';
    }

    @HttpGet(urlMapping='/legacy')
    public static String getLegacy() {
        return 'legacy';
    }
}
