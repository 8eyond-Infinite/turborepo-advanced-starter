export type FieldErrors<Field extends string> = Partial<
  Record<Field, readonly string[]>
>;

export type ActionState<
  Field extends string = string,
  Values extends Record<string, string> = Record<string, string>,
> =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors?: FieldErrors<Field>;
      formError?: string;
      correlationId?: string;
      values?: Partial<Values>;
    }
  | { status: "success" };
