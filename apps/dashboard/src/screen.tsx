type ScreenProps = {
  title: string;
  empty: string;
};

export function Screen(props: ScreenProps) {
  return (
    <section>
      <h2>{props.title}</h2>
      <div className="panel">
        <p className="status">
          <span aria-hidden="true">○</span>
          <span>Empty</span>
        </p>
        <p>{props.empty}</p>
        <p className="muted">
          Next action is named above. Nothing is scored as a single number.
        </p>
      </div>
    </section>
  );
}
