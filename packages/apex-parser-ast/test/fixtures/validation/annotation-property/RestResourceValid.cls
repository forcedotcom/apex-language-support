@RestResource(urlMapping='/api/users')
public class RestResourceValid {
    @HttpGet
    public static String getUsers() {
        return 'users';
    }
}
