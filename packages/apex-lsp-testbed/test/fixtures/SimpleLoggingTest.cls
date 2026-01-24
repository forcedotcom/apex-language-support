public class SimpleLoggingTest {
    public String name;
    public Integer count;

    public SimpleLoggingTest() {
        this.name = 'Test';
        this.count = 0;
    }

    public void doSomething() {
        System.debug('Hello from SimpleLoggingTest');
        count++;
    }

    public String getName() {
        return this.name;
    }

    public Integer getCount() {
        return this.count;
    }
}
