# Claw Customer Service - Knowledge Base Setup

## Overview

Your knowledge base is a Google Sheet that contains FAQ, policies, product information, and any other content you want the AI to use when responding to customers. The system reads from this sheet dynamically, so you can update answers in real-time without redeploying.

## Quick Setup (5 minutes)

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Create new spreadsheet"
3. Name it: "Claw Customer Service KB" (or your preferred name)
4. Copy the Sheet ID from the URL
   - Example URL: `https://docs.google.com/spreadsheets/d/1abc123xyz/edit`
   - Sheet ID: `1abc123xyz`

### Step 2: Set Up Columns

In the first row, add these exact headers:

| A | B | C | D |
|---|---|---|---|
| Category | Question | Answer | Keywords |

### Step 3: Add Your Content

**Example for an E-Commerce Store:**

| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Shipping | How long does shipping take? | Standard shipping: 5-7 business days. Express: 2-3 days. | shipping, delivery, how long, timeline |
| Shipping | What's the shipping cost? | Shipping is FREE on orders over $50! Standard orders are $5.99. | shipping, cost, free, price |
| Returns | How do I return an item? | Email us with your order number and reason. We'll send a return label. | returns, refund, exchange, back |
| Returns | What's your return policy? | 30-day return policy on unused items. Worn/damaged items cannot be returned. | return, policy, days, refund |
| Payments | Do you accept all credit cards? | Yes! We accept Visa, MC, Amex, Discover, and PayPal. | payment, credit card, paypal, methods |
| Account | How do I reset my password? | Click "Forgot Password" on login. You'll get an email with reset link. | password, reset, forgot, login |

### Step 4: Configure in Claw

During setup (`bash setup.sh`), you'll be asked:
```
Enter your Google Sheet ID: 1abc123xyz
```

That's it! The system will read from your sheet automatically.

## Best Practices

### 1. Category Organization

Use consistent categories to group related topics:

- **Shipping** - Delivery times, costs, tracking
- **Returns** - Return process, policies, timeline
- **Payments** - Accepted methods, billing issues
- **Account** - Login, password, profile
- **Technical** - App issues, browser compatibility
- **General** - Hours, contact info, company info
- **Policies** - Privacy, terms, data
- **Troubleshooting** - Common issues and fixes

### 2. Question Phrasing

Write questions as customers would ask them:

✅ DO:
- "How long does shipping take?"
- "What's your return policy?"
- "Do you accept PayPal?"
- "How do I reset my password?"

❌ DON'T:
- "Shipping Timeline Information"
- "Return Policy Details"
- "Payment Methods Accepted"

### 3. Answer Writing

Write answers that the AI can read and understand:

✅ DO:
- Be concise (1-3 sentences)
- Use simple language
- Include specific details
- "Our store is open Mon-Fri 9am-5pm EST"

❌ DON'T:
- Use very long paragraphs
- Use complex jargon
- Be too vague
- "We're usually available during business hours"

### 4. Keywords Field

Keywords help the system find relevant entries. Add words customers might use:

| Question | Keywords |
|----------|----------|
| How long does shipping take? | shipping, delivery, time, how long, timeline, days, weeks |
| Do you have overnight shipping? | fast, overnight, express, quick, rush, speed |
| What's the return policy? | returns, refunds, exchange, back, policy, days, period |

Include:
- Synonyms (ship, delivery, transport)
- Related terms (fast, quick, rush for speed)
- Common variations (how long, timeline, days)

## Sheet Structure

### Headers (Row 1) - REQUIRED

Must be exactly:

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Category | Question | Answer | Keywords |

**⚠️ Important:** The system expects row 1 to be headers. Do NOT put content in row 1.

### Data Rows (Row 2+)

Each row is one Q&A pair:
- **Category:** Topic grouping (required)
- **Question:** The FAQ question (required)
- **Answer:** The response text (required)
- **Keywords:** Comma-separated search terms (optional)

### Example Complete Sheet

```
| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Hours | What are your hours? | Open 9am-5pm EST, Mon-Fri. Closed weekends & holidays. | hours, open, closed, when, availability |
| Hours | Are you open on weekends? | No, we're closed on Saturday and Sunday. | weekend, Saturday, Sunday, closed |
| Contact | How do I contact support? | Email: support@example.com or call 1-800-123-4567 | contact, phone, email, support, help |
| Contact | What's your response time? | We respond to emails within 24 hours on business days. | response, reply, time, how long |
| Products | Do you have [product] in stock? | Check our website or call. Inventory updates hourly. | stock, available, in stock, have, sell |
| Account | How do I create an account? | Sign up with email and password. No credit card required initially. | account, register, sign up, join |
```

## Formatting Tips

### Keep Answers Short

When the AI responds to customers, it needs concise answers. Aim for 2-3 sentences:

✅ **Good:**
"We offer free shipping on orders over $50. Standard shipping takes 5-7 business days."

❌ **Too Long:**
"Our shipping policy is designed to ensure your items arrive safely and on time. We offer several shipping options depending on how quickly you need your items. Free shipping applies to orders totaling $50 or more. Standard ground shipping typically takes between 5 and 7 business days from the time your order is processed..."

### Use Multiple Entries for Related Topics

Instead of one long answer, use multiple entries:

✅ **Good:**
- Q: "How much is shipping?" A: "Shipping costs $5.99 for standard orders under $50. Free shipping on $50+."
- Q: "How long does shipping take?" A: "Standard: 5-7 days. Express: 2-3 days."
- Q: "Where's my order?" A: "Check your email for a tracking number. Click the link to track."

### Use Consistent Formatting

- Use consistent date/time formats (5-7 business days, not 5-7 biz days)
- Use consistent capitalization
- Be consistent with punctuation

## Updating Your Knowledge Base

### Making Changes

1. Open your Google Sheet
2. Edit any cell
3. **Changes take effect immediately** (no restart needed!)
4. The system caches answers for 1 hour, so it may take up to 60 seconds for changes to appear

### Adding New Entries

1. Go to the last row with data
2. Add a new row below
3. Fill in: Category, Question, Answer, Keywords
4. Done! The new entry is live within 60 seconds

### Removing Entries

1. Right-click the row number
2. Select "Delete row"
3. The entry is immediately unavailable to the AI

## Common Patterns

### Multi-Product Business

```
| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Product A | What's the price of [Product A]? | $29.99 | price, cost, how much |
| Product A | What color does [Product A] come in? | Red, blue, green, black | color, colours, available |
| Product B | Where can I buy [Product B]? | Available online or in stores. | where, buy, purchase |
```

### Service Business

```
| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Consulting | How much does consulting cost? | Custom quotes based on scope. Email for details. | price, cost, how much |
| Consulting | How long is the onboarding? | Typically 2-4 weeks depending on complexity. | onboarding, timeline, duration |
| Support | What time can you meet? | 9am-5pm EST, Mon-Fri. Arrange on call/video. | time, meeting, schedule, hours |
```

### Non-Profit

```
| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Donations | Where does my donation go? | 95% goes to programs, 5% to operations. | donation, money, where |
| Donations | Can I donate monthly? | Yes! Set up recurring gifts at [link]. | recurring, monthly, subscription |
| Volunteering | How do I volunteer? | Fill out our volunteer form at [link]. Training provided. | volunteer, help, join |
```

## Testing Your Knowledge Base

### Test in Dashboard

1. Go to `http://localhost:3000/dashboard`
2. Click "Knowledge Base"
3. You should see all your entries listed
4. Click an entry to view details

### Test with Email

1. Send an email to your connected Gmail
2. The system will generate a draft response
3. Check if it used relevant KB entries
4. Approve/reject the draft

### Test with Phone (if enabled)

1. Call your Twilio number
2. Ask a question related to your KB
3. Listen to the AI response
4. Check if it referenced correct information

### Debug KB Sync

If entries don't appear:

1. Check Google Sheet ID is correct (in `.env`)
2. Verify headers are exactly: Category | Question | Answer | Keywords
3. Check that you have at least 1 row of data (row 2+)
4. Go to dashboard and click "Sync Knowledge Base" button
5. Check `/api/dashboard/knowledge-base` endpoint in browser

## FAQ About Knowledge Bases

**Q: How many entries can I have?**
A: Unlimited! System tested with 1000+ entries.

**Q: Can I use multiple sheets in one workbook?**
A: Currently only "KB" sheet is read. Contact support for multi-sheet support.

**Q: How often does it refresh?**
A: System caches for 1 hour. Changes appear within 60 seconds.

**Q: Can I include links or formatting?**
A: Plain text only. Keep formatting simple for LLM compatibility.

**Q: What if a question isn't in my KB?**
A: The AI will say something like "I don't have that information. Please contact support."

**Q: Can the AI combine multiple KB entries?**
A: Yes! It searches for up to 5 relevant entries and combines the information.

**Q: What languages does it support?**
A: English primary. Other languages work but with lower accuracy.

## Optimization Tips

### For Better Response Quality

1. **Be Specific:** Instead of "Call us", say "Call 1-800-123-4567"
2. **Use Context:** "For shipping costs, see the Shipping category"
3. **Include Examples:** "Questions like 'When will it arrive?' should search Shipping"
4. **Update Regularly:** Remove outdated, incorrect information
5. **Use Common Phrases:** Match how customers actually ask questions

### For Better Search

1. **Rich Keywords:** Add synonyms and related terms
2. **Avoid Typos:** System can't fix misspellings
3. **Consistent Spelling:** Use either "color" or "colour", not both
4. **Common Abbreviations:** Add both "EST" and "Eastern Standard Time"

### Monitor Learning

1. Check dashboard for "Trending Issues"
2. If customers ask about something not in KB, add it!
3. If an answer gets rejected, update it
4. System learns: More good approvals = better future responses

## Troubleshooting

### Knowledge Base Not Loading

```bash
# Check Google Sheet is accessible
# Open it manually in browser - can you see it?

# Check Sheet ID in .env
# cat .env | grep GOOGLE_SHEET_ID

# Check Google APIs are enabled
# In Google Cloud Console, verify:
# - Google Sheets API is enabled
# - OAuth token is valid
```

### Responses Not Using KB

1. Check KB entries have good keywords
2. Check customer questions relate to KB topics
3. Check LLM is working (test in dashboard)
4. Monitor logs for errors

### Changes Not Appearing

1. Wait 60 seconds (cache TTL)
2. Manually sync: Go to dashboard → "Sync Knowledge Base"
3. Check for typos in Category/Question/Answer columns

## Examples by Industry

### E-Commerce

[Sample sheet with product, shipping, return, payment, account info]

### SaaS

[Sample sheet with pricing, features, onboarding, technical, billing]

### Service Business

[Sample sheet with rates, availability, booking, cancellation]

## Next Steps

1. ✅ Create Google Sheet
2. ✅ Add headers in row 1
3. ✅ Add 5-10 sample Q&A entries
4. ✅ Update `.env` with Sheet ID
5. ✅ Run setup.sh
6. ✅ Test with sample email/call
7. ✅ Expand KB as needed

## Advanced: Google Sheet Structure

**Headers Required (Row 1):**

```
Column A: Category
Column B: Question
Column C: Answer
Column D: Keywords
```

**Optional Future Columns (not yet supported):**

```
Column E: Priority (determines ranking)
Column F: LastUpdated (for versioning)
Column G: ApprovalRate (tracks effectiveness)
```

---

Your knowledge base is the heart of Claw Customer Service. The better your KB, the better the AI responses! 🧠

**Need Help?**
- Check `CLAW-SETUP.md` for troubleshooting
- Review dashboard logs for sync errors
- Contact support: [support email]
