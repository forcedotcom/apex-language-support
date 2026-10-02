/**
 * System.TriggerOperation enum values are associated with trigger events.
 * <p>Enum Values
 * Here are the values of the System.TriggerOperation enum listed by their ordinal value.
 * 0: BEFORE_INSERT
 * 1: AFTER_INSERT
 * 2: BEFORE_UPDATE
 * 3: AFTER_UPDATE
 * 4: BEFORE_DELETE
 * 5: AFTER_DELETE
 * 6: AFTER_UNDELETE
 */
global enum TriggerOperation {
    AFTER_DELETE,
    AFTER_INSERT,
    AFTER_UNDELETE,
    AFTER_UPDATE,
    BEFORE_DELETE,
    BEFORE_INSERT,
    BEFORE_UPDATE

}