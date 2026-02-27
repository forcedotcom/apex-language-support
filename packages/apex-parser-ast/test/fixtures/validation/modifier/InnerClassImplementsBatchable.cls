public class Outer {
    public class Inner implements Database.Batchable<Object> {
        public Iterator<Object> start(Database.BatchableContext bc) { return null; }
        public void execute(Database.BatchableContext bc, List<Object> scope) {}
        public void finish(Database.BatchableContext bc) {}
    }
}
