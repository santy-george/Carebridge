import { Link } from 'react-router-dom';
import { EDUCATION_ARTICLES, EDUCATION_TIPS } from '../lib/education';

export function Education() {
  return (
    <>
      <div className="tbar">
        <Link className="backbtn" to="/more" aria-label="Back to more">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Health education</h1>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        General home-care topics and tips.
      </p>

      <div
        className="lib-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
      >
        {EDUCATION_ARTICLES.map((article) => (
          <div className="educard" key={article.id}>
            <div className="educard__thumb">
              <span className="icon">
                <svg>
                  <use href={`#i-${article.icon}`} />
                </svg>
              </span>
            </div>
            <div className="educard__body">
              <div className="t">{article.title}</div>
              <div className="meta">
                <span className="icon">
                  <svg>
                    <use href="#i-clock" />
                  </svg>
                </span>
                {article.readMinutes} min read
              </div>
              <span className="educard__tag">{article.tag}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sec">Tips</div>
      <div className="card">
        {EDUCATION_TIPS.map((tip, i) => (
          <div className="lib-tip-item" key={i}>
            <span className="lib-tip-num">{i + 1}</span>
            <span className="lib-tip-text">{tip}</span>
          </div>
        ))}
      </div>
    </>
  );
}
