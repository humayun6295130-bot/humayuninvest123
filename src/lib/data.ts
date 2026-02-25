export type Asset = {
  id: string;
  name: string;
  ticker: string;
  type: 'Stock' | 'Crypto' | 'ETF';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

const assets: Asset[] = [
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', type: 'Stock', quantity: 100, avgPrice: 150.00, currentPrice: 191.45 },
  { id: '2', name: 'Bitcoin', ticker: 'BTC', type: 'Crypto', quantity: 1.5, avgPrice: 45000.00, currentPrice: 66000.21 },
  { id: '3', name: 'Vanguard S&P 500 ETF', ticker: 'VOO', type: 'ETF', quantity: 50, avgPrice: 400.00, currentPrice: 475.12 },
  { id: '4', name: 'Tesla, Inc.', ticker: 'TSLA', type: 'Stock', quantity: 25, avgPrice: 200.00, currentPrice: 177.46 },
  { id: '5', name: 'Ethereum', ticker: 'ETH', type: 'Crypto', quantity: 10, avgPrice: 2500.00, currentPrice: 3515.78 },
];

const yesterdayAssets = assets.map(asset => ({
  ...asset,
  currentPrice: asset.currentPrice * (1 - (Math.random() - 0.45) / 20)
}));

const calculatePortfolioValue = (assetList: Asset[]) => 
  assetList.reduce((acc, asset) => acc + asset.quantity * asset.currentPrice, 0);

const calculatePortfolioCost = (assetList: Asset[]) =>
  assetList.reduce((acc, asset) => acc + asset.quantity * asset.avgPrice, 0);

export const portfolio = {
  assets: assets.map(asset => {
    const totalValue = asset.quantity * asset.currentPrice;
    const totalCost = asset.quantity * asset.avgPrice;
    const gainLoss = totalValue - totalCost;
    const gainLossPercentage = (gainLoss / totalCost) * 100;
    const yesterdayPrice = yesterdayAssets.find(a => a.id === asset.id)?.currentPrice || asset.currentPrice;
    const dailyChange = asset.currentPrice - yesterdayPrice;
    const dailyChangePercentage = (dailyChange / yesterdayPrice) * 100;
    return {
      ...asset,
      totalValue,
      gainLoss,
      gainLossPercentage,
      dailyChange,
      dailyChangePercentage,
    }
  }),
  get totalValue() { return calculatePortfolioValue(this.assets) },
  get yesterdayTotalValue() { return calculatePortfolioValue(yesterdayAssets) },
  get dailyGainLoss() { return this.totalValue - this.yesterdayTotalValue },
  get dailyGainLossPercentage() { return (this.dailyGainLoss / this.yesterdayTotalValue) * 100 },
  get totalCost() { return calculatePortfolioCost(this.assets) },
  get overallGainLoss() { return this.totalValue - this.totalCost },
  get overallGainLossPercentage() { return (this.overallGainLoss / this.totalCost) * 100 },
};

export const portfolioHistory = [
  { date: 'Jan 23', value: 100000 },
  { date: 'Feb 23', value: 105000 },
  { date: 'Mar 23', value: 115000 },
  { date: 'Apr 23', value: 112000 },
  { date: 'May 23', value: 125000 },
  { date: 'Jun 23', value: 130000 },
  { date: 'Jul 23', value: 140000 },
  { date: 'Aug 23', value: 138000 },
  { date: 'Sep 23', value: 145000 },
  { date: 'Oct 23', value: 142000 },
  { date: 'Nov 23', value: 152000 },
  { date: 'Dec 23', value: portfolio.totalValue },
];
