public class Foo {
    public String name;
    public Integer age;
    public String getName() {
        System.debug('getName');
        return name;
    }
    public Integer getAge() {
        return age;
    }
}