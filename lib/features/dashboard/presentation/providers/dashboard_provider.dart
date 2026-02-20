import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../features/onboarding/domain/onboarding_state.dart';
import '../../../../features/onboarding/presentation/onboarding_provider.dart';

// ─────────────────────────────────────────────────────────────
// Chat Message Model
// ─────────────────────────────────────────────────────────────

class ChatMessage {
  final String text;
  final bool isUser;
  final String? sourceLabel;
  final DateTime timestamp;

  const ChatMessage({
    required this.text,
    required this.isUser,
    this.sourceLabel,
    required this.timestamp,
  });
}

// ─────────────────────────────────────────────────────────────
// Dashboard Computed State
// ─────────────────────────────────────────────────────────────

class DashboardState {
  final int readinessScore;
  final String scoreLabel;
  final Color scoreLabelColor;
  final double projectedCorpus;
  final double requiredCorpus;
  final double corpusGap;
  final int yearsToRetirement;
  final double inflatedMonthlyNeed;
  final bool isProfileComplete;

  const DashboardState({
    required this.readinessScore,
    required this.scoreLabel,
    required this.scoreLabelColor,
    required this.projectedCorpus,
    required this.requiredCorpus,
    required this.corpusGap,
    required this.yearsToRetirement,
    required this.inflatedMonthlyNeed,
    required this.isProfileComplete,
  });
}

// ─────────────────────────────────────────────────────────────
// Score Calculation Engine
// ─────────────────────────────────────────────────────────────

DashboardState _computeDashboard(OnboardingState s) {
  final age = s.age ?? 0;
  final targetAge = s.targetRetirementAge;
  final years = math.max(0, targetAge - age);

  final currentCorpus = s.currentCorpus ?? 0.0;
  final employeeContrib = s.monthlyEmployeeContribution ?? 0.0;
  final employerContrib = s.monthlyEmployerContribution ?? 0.0;
  final monthlyContrib = employeeContrib + employerContrib;
  final annualContrib = monthlyContrib * 12;
  final retirementMonthly = s.retirementMonthlyAmount;

  // Return early if no meaningful data
  final isComplete = age > 0 && currentCorpus > 0 && monthlyContrib > 0;

  // Step 1 — Annual return rate
  double r;
  final sector = s.sector ?? '';
  if (sector == 'government') {
    r = 0.085;
  } else if (sector == 'self_employed') {
    r = 0.095;
  } else {
    // private sector
    r = age < 35 ? 0.10 : 0.09;
  }

  // Step 1 — Project future corpus
  final double fc1 = years > 0
      ? currentCorpus * math.pow(1 + r, years)
      : currentCorpus;
  final double fc2 = (r > 0 && years > 0)
      ? annualContrib * ((math.pow(1 + r, years) - 1) / r)
      : annualContrib * years.toDouble();
  final projectedCorpus = fc1 + fc2;

  // Step 2 — Required corpus at retirement
  final inflatedMonthlyNeed = retirementMonthly * math.pow(1.06, years);
  final requiredCorpus = inflatedMonthlyNeed * 12 * 25;

  // Step 3 — Calculate score
  int score = 0;
  if (requiredCorpus > 0) {
    final ratio = projectedCorpus / requiredCorpus;
    double rawScore;
    if (ratio >= 1.0) {
      rawScore = 100;
    } else if (ratio >= 0.8) {
      rawScore = 80 + ((ratio - 0.8) / 0.2) * 20;
    } else if (ratio >= 0.5) {
      rawScore = 50 + ((ratio - 0.5) / 0.3) * 30;
    } else {
      rawScore = ratio * 100;
    }
    score = rawScore.clamp(0.0, 100.0).round();
  }

  // Score label
  String label;
  Color color;
  if (score >= 86) {
    label = 'Excellent';
    color = AppColors.success;
  } else if (score >= 71) {
    label = 'Good';
    color = const Color(0xFF66BB6A);
  } else if (score >= 51) {
    label = 'On Track';
    color = AppColors.accentBlue;
  } else if (score >= 31) {
    label = 'At Risk';
    color = const Color(0xFFFF7043);
  } else {
    label = 'Critical';
    color = AppColors.danger;
  }

  return DashboardState(
    readinessScore: score,
    scoreLabel: label,
    scoreLabelColor: color,
    projectedCorpus: projectedCorpus,
    requiredCorpus: requiredCorpus,
    corpusGap: projectedCorpus - requiredCorpus,
    yearsToRetirement: years,
    inflatedMonthlyNeed: inflatedMonthlyNeed,
    isProfileComplete: isComplete,
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Provider (computed from onboarding state)
// ─────────────────────────────────────────────────────────────

final dashboardProvider = Provider<DashboardState>((ref) {
  final onboarding = ref.watch(onboardingProvider);
  return _computeDashboard(onboarding);
});

// ─────────────────────────────────────────────────────────────
// Chat Provider
// ─────────────────────────────────────────────────────────────

class ChatNotifier extends StateNotifier<List<ChatMessage>> {
  final Ref _ref;

  ChatNotifier(this._ref)
    : super([
        ChatMessage(
          text:
              "Hi! 👋 I'm your NPS Co-Pilot. I can answer questions about your NPS, tax savings, withdrawal rules, and help you understand your retirement score. What would you like to know?",
          isUser: false,
          timestamp: DateTime.now(),
        ),
      ]);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty || _isLoading) return;

    // Add user message
    state = [
      ...state,
      ChatMessage(text: text.trim(), isUser: true, timestamp: DateTime.now()),
    ];

    _isLoading = true;
    // Notify listeners of loading state
    state = [...state];

    await Future.delayed(const Duration(milliseconds: 1200));

    final response = _getMockResponse(text.toLowerCase(), _ref);
    state = [
      ...state,
      ChatMessage(
        text: response.text,
        isUser: false,
        sourceLabel: response.source,
        timestamp: DateTime.now(),
      ),
    ];

    _isLoading = false;
    state = [...state];
  }

  _MockResponse _getMockResponse(String query, Ref ref) {
    final dashboard = ref.read(dashboardProvider);
    final score = dashboard.readinessScore;

    if (query.contains('withdraw') || query.contains('exit')) {
      return _MockResponse(
        text:
            'Under NPS rules, you can make partial withdrawals after 3 years for specific purposes like education, home purchase, or medical treatment — up to 25% of your contributions. '
            'Full withdrawal is allowed at age 60, where 60% is tax-free as lump sum and 40% must purchase an annuity.',
        source: 'PFRDA Circular 2023-05',
      );
    }

    if (query.contains('tax') ||
        query.contains('saving') ||
        query.contains('deduction')) {
      return _MockResponse(
        text:
            'You can claim deductions under 80CCD(1) up to 10% of your CTC and an additional ₹50,000 under 80CCD(1B). '
            'This could save you up to ₹46,800 in taxes annually under the old regime.',
        source: 'Income Tax Act Section 80CCD',
      );
    }

    if (query.contains('score') ||
        query.contains('readiness') ||
        query.contains('calculated')) {
      return _MockResponse(
        text:
            'Your Readiness Score of $score% is based on your current corpus, monthly contributions, and your retirement lifestyle target. '
            "The biggest lever to improve your score right now is increasing your monthly contribution.",
        source: 'NPS Pulse calculation engine',
      );
    }

    if (query.contains('tier') ||
        query.contains('tier ii') ||
        query.contains('explain')) {
      return _MockResponse(
        text:
            'NPS has two tiers. Tier I is the mandatory pension account with tax benefits but restricted withdrawals — this is your primary retirement account. '
            'Tier II is a voluntary savings account with no tax benefits but full withdrawal flexibility, functioning like a mutual fund without the exit load.',
        source: 'PFRDA NPS Guidelines 2024',
      );
    }

    return _MockResponse(
      text:
          "That's a great question about NPS. I'm still being trained on the full PFRDA circular database. "
          'For now I can help with withdrawal rules, tax deductions, Tier I vs II differences, and your personal readiness score. What would you like to know about these?',
    );
  }
}

class _MockResponse {
  final String text;
  final String? source;
  const _MockResponse({required this.text, this.source});
}

final chatProvider = StateNotifierProvider<ChatNotifier, List<ChatMessage>>((
  ref,
) {
  return ChatNotifier(ref);
});

final chatLoadingProvider = Provider<bool>((ref) {
  final notifier = ref.read(chatProvider.notifier);
  // Force rebuild when state changes by watching state
  ref.watch(chatProvider);
  return notifier.isLoading;
});
