function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountRate = 1 - (discount / 100);
    return sale_price * quantity * discountRate;
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    if (!data 
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Отсутствуют необходимые функции для расчётов');
    }
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Переданные опции должны быть функциями');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});
    
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;
        
        seller.sales_count += 1;
        seller.revenue += record.total_amount;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            
            seller.profit += profit;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    const totalSellers = sellerStats.length;
    
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);
        
        const productsArray = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        seller.top_products = productsArray;
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}