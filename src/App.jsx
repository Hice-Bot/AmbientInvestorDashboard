import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import './App.css';

const Sparkline = ({ data, color }) => {
  if (!data || !data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CoinTile = ({ coin, index, formatCurrency, formatMarketCap }) => {
  const isUp24h = coin.price_change_percentage_24h >= 0;
  const prevPriceRef = useRef(coin.current_price);
  const [glowClass, setGlowClass] = useState('');
  const lastGlowRef = useRef(isUp24h ? 'glow-up' : 'glow-down');

  const triggerGlow = (type) => {
    setGlowClass(type);
    lastGlowRef.current = type;
    setTimeout(() => {
      setGlowClass((currentClass) => currentClass === type ? '' : currentClass);
    }, 2000);
  };

  // Real price update glow
  useEffect(() => {
    if (prevPriceRef.current !== coin.current_price) {
      const isHigher = coin.current_price > prevPriceRef.current;
      triggerGlow(isHigher ? 'glow-up' : 'glow-down');
      prevPriceRef.current = coin.current_price;
    }
  }, [coin.current_price]);

  // Random lively flashes staggered over time
  useEffect(() => {
    const initialDelay = Math.random() * 15000;
    let intervalId;
    
    const startInterval = () => {
      intervalId = setInterval(() => {
        if (Math.random() < 0.2) {
          triggerGlow(lastGlowRef.current);
        }
      }, 15000);
    };

    const timeoutId = setTimeout(() => {
      if (Math.random() < 0.2) triggerGlow(lastGlowRef.current);
      startInterval();
    }, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={`coin-row ${glowClass}`}>
      <div className="coin-left">
        <div className="coin-rank">{index + 1}</div>
        <img src={coin.image} alt={coin.name} className="coin-icon" />
        <div className="coin-info-col">
          <div className="coin-symbol">{coin.symbol}</div>
          <div className="coin-marketcap">{formatMarketCap(coin.market_cap)}</div>
        </div>
      </div>
      
      <div className="coin-chart">
         <Sparkline data={coin.sparkline_in_7d?.price} color={isUp24h ? '#10b981' : '#ef4444'} />
      </div>

      <div className="coin-right">
        <div className="coin-price">{formatCurrency(coin.current_price)}</div>
        <div className={`coin-change ${isUp24h ? 'text-green glow-green' : 'text-red glow-red'}`}>
          {isUp24h ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

function App() {
  const [topCoins, setTopCoins] = useState([]);
  const [trendingCoins, setTrendingCoins] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [time, setTime] = useState(new Date());

  // Dynamic Banner State
  const [newsHeadlines, setNewsHeadlines] = useState({
    crypto: 'Fetching latest crypto news...',
    world: 'Fetching world news...',
    finance: 'Fetching financial updates...',
    video: 'Fetching latest video...'
  });
  const [bannerMessageIndex, setBannerMessageIndex] = useState(0);
  const [bannerFading, setBannerFading] = useState(false);

  const bannerMessages = [
    `📰 Top Crypto News: ${newsHeadlines.crypto}`,
    `⚡ Crypto moves fast! Don't miss a thing - Like and Subscribe now!`,
    `🌍 Top World News: ${newsHeadlines.world}`,
    `🤝 Share with a friend so they have 24/7 crypto updates!`,
    `📈 Top Financial News: ${newsHeadlines.finance}`,
    `💬 Which crypto will trend next? Let us know in the comments below!`,
    `🎥 Our Latest Video: ${newsHeadlines.video}`
  ];

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Banner Rotation
  useEffect(() => {
    const rotateTimer = setInterval(() => {
      setBannerFading(true);
      setTimeout(() => {
        setBannerMessageIndex((prev) => (prev + 1) % bannerMessages.length);
        setBannerFading(false);
      }, 500); // wait for fade out
    }, 15000); // 15s display time

    return () => clearInterval(rotateTimer);
  }, [bannerMessages.length]);

  // Fetch Data
  useEffect(() => {
    const fetchTopCoins = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true');
        if (res.ok) {
          const data = await res.json();
          setTopCoins(data);
        }
      } catch (err) {
        console.error("Error fetching top coins:", err);
      }
    };

    const fetchTrending = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
        if (res.ok) {
          const data = await res.json();
          setTrendingCoins(data.coins.slice(0, 5));
        }
      } catch (err) {
        console.error("Error fetching trending coins:", err);
      }
    };

    const fetchGlobal = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/global');
        if (res.ok) {
          const data = await res.json();
          setGlobalData(data.data);
        }
      } catch (err) {
        console.error("Error fetching global data:", err);
      }
    };

    const fetchNewsFeeds = async () => {
      try {
        const [cryptoRes, worldRes, financeRes, videoRes] = await Promise.all([
          fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss'),
          fetch('https://api.rss2json.com/v1/api.json?rss_url=http%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fworld%2Frss.xml'),
          fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fsearch.cnbc.com%2Frs%2Fsearch%2Fcombinedcms%2Fview.xml%3FpartnerId%3Dwrss01%26id%3D10000664'),
          // Using a placeholder channel ID (CoinBureau) if none provided
          fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.youtube.com%2Ffeeds%2Fvideos.xml%3Fchannel_id%3DUCqK_GSMbpiV8spgD3ZGloSw')
        ]);

        const cryptoData = await cryptoRes.json();
        const worldData = await worldRes.json();
        const financeData = await financeRes.json();
        const videoData = await videoRes.json();

        setNewsHeadlines({
          crypto: cryptoData.items?.[0]?.title || 'Markets Rally Today',
          world: worldData.items?.[0]?.title || 'Global Updates',
          finance: financeData.items?.[0]?.title || 'Economic Indicators Rise',
          video: videoData.items?.[0]?.title || 'Subscribe for more updates!'
        });
      } catch (err) {
        console.error("Error fetching RSS news:", err);
      }
    };

    fetchTopCoins();
    fetchTrending();
    fetchGlobal();
    fetchNewsFeeds();

    // Polling intervals
    const topTimer = setInterval(fetchTopCoins, 60000); // 60s
    const trendTimer = setInterval(fetchTrending, 300000); // 5m
    const globalTimer = setInterval(fetchGlobal, 300000); // 5m
    const newsTimer = setInterval(fetchNewsFeeds, 1800000); // 30m

    return () => {
      clearInterval(topTimer);
      clearInterval(trendTimer);
      clearInterval(globalTimer);
      clearInterval(newsTimer);
    };
  }, []);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '$0.00';
    if (val >= 1) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 4 }).format(val);
  };

  const formatMarketCap = (val) => {
    if (!val) return '$0';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="app-container">
      {/* Header Area */}
      <div className="header glass-panel">
        <div className="header-left">
          <div className="live-indicator animate-pulse">
            <div className="live-dot"></div>
            LIVE
          </div>
          <h1 className="app-title">THE AMBIENT INVESTOR</h1>
        </div>

        <div className="header-center">
          <div className="logo-belt">
            {[1, 2].map((loopIndex) => (
              <div key={`header-loop-${loopIndex}`} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {topCoins.slice(0, 15).map((coin, i) => (
                  <img key={`${coin.id}-${i}`} src={coin.image} alt={coin.symbol} className="header-floating-logo" />
                ))}
                <div style={{ fontWeight: 'bold', color: '#38bdf8', letterSpacing: '0.5px', whiteSpace: 'nowrap', padding: '0 1rem' }}>
                  ⭐ Like and Subscribe to stay on Top! ⭐
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="header-right">
          {globalData && (
            <>
              <div className="stat-group">
                <span className="stat-label">Market Cap</span>
                <span className="stat-value">{formatMarketCap(globalData.total_market_cap.usd)}</span>
              </div>
              <div className="stat-group">
                <span className="stat-label">24h Vol</span>
                <span className="stat-value">{formatMarketCap(globalData.total_volume.usd)}</span>
              </div>
            </>
          )}
          <div className="stat-group">
            <span className="stat-label">New York Time</span>
            <span className="stat-value text-green" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {time.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Header Text Box */}
      <div className={`sub-header-banner glass-panel ${bannerFading ? 'fade-out' : 'fade-in'}`} style={{ padding: '0.4rem 1rem', marginBottom: '0.25rem', marginTop: '0.25rem' }}>
        {bannerMessages[bannerMessageIndex]}
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="coins-container glass-panel">
          <div className="coins-list">
            {topCoins.map((coin, index) => (
              <CoinTile key={coin.id} coin={coin} index={index} formatCurrency={formatCurrency} formatMarketCap={formatMarketCap} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="footer-marquee glass-panel">
        <div className="marquee-label">
          <Activity size={18} style={{ marginRight: '8px' }} />
          TRENDING
        </div>
        <div className="marquee-wrapper">
          <div className="marquee-content">
            {[1, 2].map((loopIndex) => (
              <div key={`loop-${loopIndex}`} style={{ display: 'flex', gap: '2.5rem' }}>
                {trendingCoins.map((item, i) => (
                  <div key={`${item.item.id}-${i}`} className="marquee-item">
                    <img src={item.item.thumb} alt={item.item.name} />
                    <span>{item.item.name}</span>
                    <span className="text-secondary">({item.item.symbol})</span>
                    <span className="text-green glow-green">#{item.item.market_cap_rank || '?'}</span>
                  </div>
                ))}
                <div className="marquee-item message-highlight" style={{ fontWeight: 'bold', color: '#38bdf8', letterSpacing: '0.5px' }}>
                  ⭐ Like and Subscribe to stay on Top! ⭐
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
