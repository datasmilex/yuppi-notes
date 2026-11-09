export default function Avatar({ name = '?', url, size = 56 }) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR');
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {url ? <img src={url} alt="" /> : <span>{initials}</span>}
    </div>
  );
}
