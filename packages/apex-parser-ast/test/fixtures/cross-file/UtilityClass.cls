public class UtilityClass {
    public static String formatString(String input) {
        if (input == null) {
            return '';
        }
        return input.trim();
    }
    
    public static Integer calculateSum(List<Integer> numbers) {
        Integer sum = 0;
        for (Integer num : numbers) {
            sum += num;
        }
        return sum;
    }
    
    public static Boolean isValidEmail(String email) {
        if (email == null || email.length() == 0) {
            return false;
        }
        return email.contains('@') && email.contains('.');
    }
}
