global class GlobalMethodWithDeprecatedReturnCorrect {
    @Deprecated
    global DeprecatedType getDeprecatedType() {
        return new DeprecatedType();
    }
}
